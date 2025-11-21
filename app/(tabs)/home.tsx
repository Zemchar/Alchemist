import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    Alert,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {IconSymbol} from '@/components/ui/IconSymbol';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {LinearGradient} from 'expo-linear-gradient';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Experience, Ingestion, Mass, MergedSubstanceData, RawSubstanceData} from "@/constants/DataTypes";
import {Chip} from '@rneui/themed';
import * as fs from 'expo-file-system';
import Toast from 'react-native-toast-message';
import AddSubstance, {handleSubmit, SubstanceIngestionData} from '@/app/screens/AddSubstance';

// --- Constants ---
const fileUri = fs.documentDirectory + 'experiences.json';
const rawSubstanceData: RawSubstanceData = require('@/constants/datamed/data/data.json');

// Merged colors. Ensure there are no conflicts.
const substanceColors: Record<string, string> = {
    "Unknown": '#BDBDBD',
    // Add other specific substance colors here if they exist
};

// --- Main Component ---
export default function ExploreScreen() {
    // --- Hooks & Basic State ---
    const colorScheme = useColorScheme();
    const navigation = useNavigation();

    // --- Tab State ---
    const [activeTab, setActiveTab] = useState<'substances' | 'journal'>('journal');

    // --- Shared State ---
    const [searchQuery, setSearchQuery] = useState("");

    // --- Substance-Specific State ---
    const [filteredSubstances, setFilteredSubstances] = useState<MergedSubstanceData[]>([]);
    const substanceListRef = useRef(null);

    // --- Journal-Specific State ---
    const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
    const [filteredExperiences, setFilteredExperiences] = useState<Experience[]>([]);
    const [quickAddData, setQuickAddData] = useState<{
        substance: string,
        dose: number,
        units: string,
        title: string,
        administrationRoute: string
    } | null>(null);
    const [partialQuickAddData, setPartialQuickAddData] = useState<{
        substance: boolean,
        dose: boolean,
        units: boolean,
        title: boolean,
        administrationRoute: boolean
    }>({dose: false, units: false, administrationRoute: false, substance: false, title: false});
    const [matchingSubstances, setMatchingSubstances] = useState<string[]>([]);
    const journalListRef = useRef(null);

    // Add state for AddSubstance modal
    const [isAddSubstanceVisible, setIsAddSubstanceVisible] = useState(false);

    // --- Dynamic Colors ---
    const tintColor = Colors[colorScheme ?? 'light'].tint;
    const textColor = Colors[colorScheme ?? 'light'].text;
    const searchBgColor = Colors[colorScheme ?? 'light'].background;
    const searchPlaceholderColor = Colors[colorScheme ?? 'light'].searchPlaceholder;
    const metaTextColor = Colors[colorScheme ?? 'light'].metaText;
    const dateTextColor = Colors[colorScheme ?? 'light'].dateText;

    // --- Helper Functions (Shared) ---
    // Helper to merge arrays, preferring PW and de-duplicating
    const mergeArrays = (pwArr?: string[], tsArr?: string[]): string[] => {
        const merged = new Set<string>();
        if (pwArr) {
            pwArr.forEach(item => merged.add(item));
        }
        if (tsArr) {
            tsArr.forEach(item => merged.add(item));
        }
        return Array.from(merged);
    };

    // --- Substance Data Processing ---
    /**
     * Processes raw datamed data json and merges it into usable data structures.
     */
    const processSubstanceData = (rawData: RawSubstanceData): MergedSubstanceData[] => {
        const processed: MergedSubstanceData[] = [];
        for (const substanceKey in rawData) {
            if (rawData.hasOwnProperty(substanceKey)) {
                const substanceEntry = rawData[substanceKey];
                const psychonautwikiData = substanceEntry.psychonautwiki;
                const tripsitData = substanceEntry.tripsit;

                const merged: MergedSubstanceData = {
                    ...(psychonautwikiData || tripsitData),
                    psychonautwikiData: psychonautwikiData,
                    tripsitData: tripsitData,
                } as MergedSubstanceData;

                if (tripsitData) {
                    merged.name = merged.name || tripsitData.name;
                    merged.pretty_name = merged.pretty_name || tripsitData.pretty_name;
                    merged.aliases = mergeArrays(psychonautwikiData?.aliases, tripsitData.aliases);
                    merged.categories = mergeArrays(psychonautwikiData?.categories, tripsitData.categories);
                    merged.effects = mergeArrays(psychonautwikiData?.effects, tripsitData.effects);
                    merged.properties = {
                        ...(psychonautwikiData?.properties || tripsitData.properties),
                        summary: psychonautwikiData?.properties?.summary || tripsitData.properties?.summary || "",
                        avoid: psychonautwikiData?.properties?.avoid || tripsitData.properties?.avoid || "",
                        test_kits: psychonautwikiData?.properties?.test_kits || tripsitData.properties?.test_kits || "",
                        half_life: psychonautwikiData?.properties?.half_life || tripsitData.properties?.half_life || "",
                        note: psychonautwikiData?.properties?.note || tripsitData.properties?.note || "",
                        warnings: mergeArrays(psychonautwikiData?.properties?.warnings, tripsitData.properties?.warnings),
                    };
                    if (psychonautwikiData?.interactions || tripsitData.interactions) {
                        merged.interactions = {
                            dangerous: mergeArrays(psychonautwikiData?.interactions?.dangerous, tripsitData.interactions?.dangerous),
                            unsafe: mergeArrays(psychonautwikiData?.interactions?.unsafe, tripsitData.interactions?.unsafe),
                            caution: mergeArrays(psychonautwikiData?.interactions?.caution, tripsitData.interactions?.caution),
                        };
                    } else {
                        merged.interactions = {dangerous: [], unsafe: [], caution: []};
                    }
                    merged.metadata = {
                        ...(psychonautwikiData?.metadata || tripsitData.metadata),
                        source_url: psychonautwikiData?.metadata?.source_url || tripsitData.metadata?.source_url || "",
                    };
                    if (!merged.timing && tripsitData.timing) merged.timing = tripsitData.timing;
                    if (!merged.dosage && tripsitData.dosage) merged.dosage = tripsitData.dosage;
                    if (!merged.links && tripsitData.links) merged.links = tripsitData.links;
                    if (!merged.legal_status && tripsitData.legal_status) merged.legal_status = tripsitData.legal_status;
                    merged.effects_detailed = (psychonautwikiData?.effects_detailed && psychonautwikiData.effects_detailed.length > 0)
                        ? psychonautwikiData.effects_detailed
                        : tripsitData.effects_detailed;
                }

                merged.name = merged.name || substanceKey;
                merged.pretty_name = merged.pretty_name || merged.name;
                merged.aliases = merged.aliases || [];
                merged.categories = merged.categories || [];
                merged.properties = merged.properties || {
                    summary: "",
                    avoid: "",
                    test_kits: "",
                    half_life: "",
                    warnings: [],
                    note: ""
                };
                merged.timing = merged.timing || {onset: {}, duration: {}, aftereffects: {}};
                merged.dosage = merged.dosage || {routes: {}, bioavailability: null};
                merged.effects = merged.effects || [];
                merged.effects_detailed = merged.effects_detailed || [];
                merged.interactions = merged.interactions || {dangerous: [], unsafe: [], caution: []};
                merged.links = merged.links || {experiences: [], research: [], wikipedia: [], general: []};
                merged.legal_status = merged.legal_status || {international: ""};
                merged.metadata = merged.metadata || {last_updated: "", source_url: "", confidence_score: null};

                processed.push(merged);
            }
        }
        return processed;
    };

    const determineSubstanceGradientColors = (substanceName: string): [string, string] => {
        const color = substanceColors[substanceName.toLowerCase()] || substanceColors["Unknown"];
        return [color, color];
    };

    /**
     * Shorthand to navigate to the substance details page.
     */
    const openSubstanceDetail = (substance: MergedSubstanceData) => {
        // @ts-ignore
        navigation.navigate('screens/SubstanceDetails', {substance});
    };

    // --- Journal Data Processing & FS ---
    const formatDateTime = (unixTimestamp: number): string => {
        const date = new Date(unixTimestamp);
        return `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()]}, ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
    };

    const extractSubstanceNames = (ingestions: Ingestion[]): string[] => {
        return [...new Set(ingestions.map(ingestion => ingestion.substanceName))];
    };

    const extractConsumerNames = (ingestions: Ingestion[]): string[] => {
        const consumers = ingestions
            .filter(ingestion => ingestion.consumerName && ingestion.consumerName !== 'null')
            .map(ingestion => ingestion.consumerName as string);
        return [...new Set(consumers)];
    };

    const determineJournalGradientColors = (substanceNames: string[]): [string, string] => {
        const colors = substanceNames.map(
            (substance) => substanceColors[substance] || substanceColors["Unknown"]
        );
        if (colors.length === 0) return [substanceColors["Unknown"], substanceColors["Unknown"]];
        if (colors.length === 1) return [colors[0], colors[0]];
        return [colors[0], colors[1]];
    };

    const formatSubstances = (substances: string[]): string => {
        if (!substances.length) return "Unknown";
        if (substances.length === 1) return substances[0];
        const substancesCopy = [...substances];
        const lastSubstance = substancesCopy.pop();
        return `${substancesCopy.join(', ')}, and ${lastSubstance}`;
    };

    const saveExperiencesToFile = async (data: Experience[]) => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            await fs.writeAsStringAsync(fileUri, jsonString, {
                encoding: fs.EncodingType.UTF8
            });
            console.log('Experiences saved successfully to', fileUri);
        } catch (error) {
            console.error('Error saving experiences:', error);
            Alert.alert("Error", "Could not save experiences to file.");
        }
    };

    const loadExperiencesFromFile = async () => {
        try {
            const fileInfo = await fs.getInfoAsync(fileUri);
            if (fileInfo.exists) {
                // @ts-ignore
                const jsonString = await fs.readAsStringAsync(fileUri, {
                    encoding: fs.EncodingType.UTF8
                });
                const data = JSON.parse(jsonString);
                setAllExperiences(data);
            } else {
                console.log("No experiences file found, loading default data.");
                setAllExperiences([]); // Start with empty array if no file
            }
        } catch (error) {
            console.error('Error loading experiences:', error);
            Alert.alert("Error", "Could not load experiences. Loading defaults.");
            setAllExperiences([]);
        }
    };

    const openExperienceDetail = (experience: Experience) => {
        // @ts-ignore
        navigation.navigate('screens/ExperienceDetails', {experience});
    };

    const onFabPress = async () => {
        if (quickAddData) {
            const recentExperience = allExperiences.length > 0 ? allExperiences[allExperiences.length - 1] : null;
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            if (recentExperience && recentExperience?.ingestions[recentExperience?.ingestions.length - 1].creationDate >= twentyFourHoursAgo && !quickAddData.title.split("|").pop()?.toLowerCase().startsWith("n")) {
                // Add to recent experience
                console.log("Adding to Recent Experience")

                const updatedExperience = {
                    ...recentExperience,
                    ingestions: [...recentExperience.ingestions, {
                        substanceName: quickAddData.substance,
                        dose: new Mass(quickAddData.dose.toString() + quickAddData.units + "g"),
                        units: quickAddData.units + "g",
                        administrationRoute: quickAddData.administrationRoute,
                        time: Date.now(),
                        creationDate: Date.now(),
                        notes: '',
                        consumerName: null,
                        endTime: null,
                        isDoseAnEstimate: false,
                        estimatedDoseStandardDeviation: null,
                        customUnitId: null,
                        stomachFullness: null
                    }]
                };
                const updatedData = [...allExperiences.slice(0, -1), updatedExperience];
                setAllExperiences(updatedData);
                await saveExperiencesToFile(updatedData);
                setSearchQuery('')
                Toast.show({
                    type: "success",
                    text1: `Added a ${quickAddData.substance} ingestion to ${recentExperience.title}`
                })
            } else {
                // Create new experience 
                const newExperience: Experience = {
                    creationDate: Date.now(),
                    sortDate: Date.now(),
                    title: (quickAddData.title && quickAddData.title.length > 0) ? quickAddData.title : `Quick Add: ${quickAddData.substance}`,
                    ingestions: [{
                        substanceName: quickAddData.substance,
                        dose: new Mass(quickAddData.dose.toString() + quickAddData.units),
                        units: quickAddData.units,
                        administrationRoute: quickAddData.administrationRoute,
                        time: Date.now(),
                        creationDate: Date.now(),
                        notes: '',
                        consumerName: null,
                        endTime: null,
                        isDoseAnEstimate: false,
                        estimatedDoseStandardDeviation: null,
                        customUnitId: null,
                        stomachFullness: null
                    }],
                    location: null,
                    timedNotes: [],
                    isFavorite: false,
                    text: '',
                    ratings: [],
                    fullJSON: ''
                };
                const updatedData = [...allExperiences, newExperience];
                setAllExperiences(updatedData);
                await saveExperiencesToFile(updatedData);
                Toast.show({
                    type: "success",
                    text1: `Created a new ${newExperience.ingestions[0].substanceName} experience called ${newExperience.title}`
                })
            }

            setSearchQuery('');
        } else {
            // Instead of navigating, show the modal
            setIsAddSubstanceVisible(true);
        }
    };

    // Add handler for substance addition
    const handleAddSubstance = async (data: SubstanceIngestionData) => {
        // Handle the substance data addition here
        const success = await handleSubmit(data);
        if (success) {
            setIsAddSubstanceVisible(false);
            await loadExperiencesFromFile();
        }
    };

    // --- Effects ---

    // Load experiences on mount
    useEffect(() => {
        loadExperiencesFromFile();
    }, []);
    useEffect(() => {
        if (!isAddSubstanceVisible) {
            loadExperiencesFromFile();
            console.log("Reloaded Experiences")
        }
    }, [isAddSubstanceVisible])
    useFocusEffect(
        React.useCallback(() => {
            // This function will be called every time the screen is focused (i.e., the tab is clicked)
            console.log('Tab screen focused!');
            // You can call your desired function here
            loadExperiencesFromFile();

            return () => {
                // This function will be called when the screen loses focus (i.e., another tab is clicked)
                console.log('Tab screen unfocused!');
                // Perform any cleanup if necessary
            };
        }, []) // Empty dependency array ensures the effect runs only on mount and unmount
    );

    // Filter Substances List
    useEffect(() => {
        const allSubstances = processSubstanceData(rawSubstanceData);
        const sortedData = [...allSubstances].sort((a, b) =>
            (a.pretty_name || a.name).localeCompare(b.pretty_name || b.name)
        );

        if (!searchQuery.trim()) {
            setFilteredSubstances(sortedData);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filtered = sortedData.filter((substance) => {
            if ((substance.pretty_name && substance.pretty_name.toLowerCase().includes(query))) return true;
            if ((substance.name && substance.name.toLowerCase().includes(query))) return true;
            if (substance.aliases.some(alias => alias.toLowerCase().includes(query))) return true;
            if (substance.categories.some(category => category.toLowerCase().includes(query))) return true;
            return false;
        });
        setFilteredSubstances(filtered);
    }, [searchQuery]);

    // Filter Journal List
    useEffect(() => {
        setPartialQuickAddData({
            substance: false,
            units: false,
            dose: false,
            administrationRoute: false,
            title: false
        });

        const sortedData = [...allExperiences].sort((a, b) => (b.sortDate || b.creationDate) - (a.sortDate || a.creationDate));
        // Use the new regex from your file
        const parts = searchQuery.trim().split(/\s+/);
        let substance, dose, units, administrationRoute, title;
// Load your reference data
        const substances = require('@/constants/datamed/data/substances.json');
        const routes = require('@/constants/datamed/data/routes.json');

// Check each part against your references immediately
        parts.forEach(part => {
            // Check for dose format
            const doseMatch = part.match(/^(\d+(?:\.\d+)?)(m|mc|u|k)?g$/);
            if (doseMatch) {
                dose = doseMatch[1];
                units = doseMatch[2];
                setPartialQuickAddData(prev => ({
                    ...prev,
                    dose: true,
                    units: true
                }));
            }

            // Check for substance match
            if (substances.substances.some(s =>
                s.toLowerCase() === part.toLowerCase()
            )) {
                substance = part.toUpperCase();
                setPartialQuickAddData(prev => ({
                    ...prev,
                    substance: true
                }));
            }

            // Check for route match
            if (routes.routes.some(r =>
                r.toLowerCase() === part.toLowerCase()
            )) {
                administrationRoute = part;
                setPartialQuickAddData(prev => ({
                    ...prev,
                    administrationRoute: true
                }));
            }
        });

// Check for title (after all other parts are processed)
        if (parts.length >= 4) {
            title = parts.slice(3).join(' ');
            setPartialQuickAddData(prev => ({
                ...prev,
                title: true
            }));
        }

// Set quick add data only if required fields are present
        if (administrationRoute && units && dose && substance) {
            setQuickAddData({
                administrationRoute,
                dose: parseFloat(dose),
                units,
                substance,
                title: title || ""
            });
        } else {
            setQuickAddData(null);
        }


        if (!searchQuery.trim()) {
            setFilteredExperiences(sortedData);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filtered = sortedData.filter((experience) => {
            if (experience.title && experience.title.toLowerCase().includes(query)) return true;
            if (experience.location?.name && experience.location.name.toLowerCase().includes(query)) return true;
            const substanceMatch = experience.ingestions.some((ingestion: Ingestion) => ingestion.substanceName.toLowerCase().includes(query));
            if (substanceMatch) return true;
            const consumerMatch = experience.ingestions.some((ingestion: Ingestion) => ingestion.consumerName && ingestion.consumerName.toLowerCase().includes(query));
            if (consumerMatch) return true;
            return false;
        });

        setFilteredExperiences(filtered);

    }, [searchQuery, allExperiences]);

    // Effect to find matching substances for chips
    useEffect(() => {
        if (searchQuery.trim()) {
            const substances = require('@/constants/datamed/data/substances.json');
            const matches = substances.substances.filter((s: string) =>
                s.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setMatchingSubstances(matches.slice(0, 5)); // Show top 5 matches
        } else {
            setMatchingSubstances([]);
        }
    }, [searchQuery]);


    // --- Render Items ---

    // Render Function for Substance List
    const renderSubstanceItem = ({item}: { item: MergedSubstanceData }) => {
        const title = item.pretty_name || item.name || "Unnamed Substance";
        const gradientColors = determineSubstanceGradientColors(item.name);

        return (
            <TouchableOpacity
                style={[styles.itemContainer, {backgroundColor: searchBgColor}]}
                onPress={() => {
                    openSubstanceDetail(item)
                }}
            >
                <LinearGradient colors={gradientColors} style={styles.gradientBar}/>
                <View style={styles.content}>
                    <Text style={[styles.listTitle, {color: textColor}]}>{title}</Text>
                    {item.aliases?.length > 0 &&
                        <Text style={[styles.listDescription, {color: metaTextColor}]}>
                            {item.aliases.join(', ')}
                        </Text>
                    }
                    <View style={styles.metaRow}>
                        {item.categories.map((category, index) => (
                            <Chip
                                containerStyle={styles.chipContainer}
                                titleStyle={[styles.chipTitle, {color: textColor}]}
                                buttonStyle={[styles.chipButton]}
                                key={index}
                                title={category}
                                type="outline"
                                onPress={() => console.log(`Chip Pressed: ${category}`)}
                                onLongPress={() => {
                                    setSearchQuery(category);
                                }}
                            />
                        ))}
                    </View>
                </View>
                <IconSymbol name="chevron.forward" size={24} color="#aaa"/>
            </TouchableOpacity>
        );
    };

    // Render Function for Journal List
    const renderJournalItem = ({item}: { item: Experience }) => {
        const substanceNames = extractSubstanceNames(item.ingestions);
        const consumerNames = extractConsumerNames(item.ingestions);
        const consumerText = consumerNames.length && consumerNames[0] !== 'null'
            ? `${consumerNames.join(', ')}`
            : '';
        const locationText = item.location?.name ? `${item.location.name}` : '';
        const gradientColors = determineJournalGradientColors(substanceNames);
        const startTime = formatDateTime(item.sortDate || item.creationDate);

        return (
            <TouchableOpacity
                style={[styles.itemContainer, {backgroundColor: searchBgColor}]}
                onPress={() => openExperienceDetail(item)}
            >
                <LinearGradient colors={gradientColors} style={styles.gradientBar}/>
                <View style={styles.content}>
                    <Text style={[styles.listTitle, {color: textColor}]}>{item.title || "Unnamed Experience"}</Text>
                    <Text style={styles.substances}>
                        {formatSubstances(substanceNames)}
                    </Text>
                    <View>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            {consumerText ? (
                                <>
                                    <IconSymbol
                                        name="person.2.fill"
                                        color={metaTextColor}
                                        size={20}
                                        style={styles.icon}
                                    />
                                    <Text
                                        style={[
                                            styles.meta,
                                            {
                                                color: metaTextColor,
                                                marginLeft: 4,
                                                alignSelf: 'flex-start',
                                            },
                                        ]}
                                    >
                                        {consumerText}
                                    </Text>
                                </>
                            ) : (
                                <View style={{width: 24}}/>
                            )}
                        </View>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Text style={[styles.date, {color: dateTextColor, flex: 1}]}>{startTime}</Text>
                            {locationText ? (
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <IconSymbol name="mappin" size={16} color={textColor}/>
                                    <Text
                                        style={[
                                            styles.meta,
                                            {
                                                color: metaTextColor,
                                                marginLeft: 4,
                                                alignSelf: 'flex-start',
                                            },
                                        ]}
                                    >
                                        {locationText}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>
                <IconSymbol name="chevron.forward" size={24} color="#aaa"/>
            </TouchableOpacity>
        );
    };

    // --- Memoized Styles ---
    const searchBarStyle = useMemo(() => [
        styles.searchContainer,
        {
            backgroundColor: searchBgColor,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
        }
    ], [searchBgColor, colorScheme]);

    // --- Main Render ---
    return (
        <View style={styles.mainContainer}>
            <View style={[styles.container, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, {color: textColor}]}>Home</Text>
                    <View style={styles.leftIcons}>
                        <Pressable style={styles.iconButton}>
                            <IconSymbol
                                name="star"
                                size={28}
                                color={tintColor}
                                style={styles.icon}
                            />
                        </Pressable>
                    </View>
                </View>

                {/* Tab Switcher */}
                <View style={[styles.tabContainer, {borderBottomColor: searchPlaceholderColor}]}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'journal' && [styles.tabButtonActive, {borderBottomColor: tintColor}]
                        ]}
                        onPress={() => setActiveTab('journal')}
                    >
                        <Text
                            style={[styles.tabText, {color: activeTab === 'journal' ? tintColor : searchPlaceholderColor}]}>
                            Journal
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'substances' && [styles.tabButtonActive, {borderBottomColor: tintColor}]
                        ]}
                        onPress={() => setActiveTab('substances')}
                    >
                        <Text
                            style={[styles.tabText, {color: activeTab === 'substances' ? tintColor : searchPlaceholderColor}]}>
                            Substances
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={searchBarStyle}>
                    <IconSymbol
                        name="magnifyingglass"
                        size={20}
                        color={searchPlaceholderColor}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={[styles.searchInput, {color: textColor}]}
                        placeholder="Search substances or journal"
                        placeholderTextColor={searchPlaceholderColor}
                        value={searchQuery}
                        onChangeText={(text: string) => {
                            setSearchQuery(text);
                            // @ts-ignore
                            substanceListRef.current?.scrollToOffset({offset: 0, animated: false});
                            // @ts-ignore
                            journalListRef.current?.scrollToOffset({offset: 0, animated: false});
                        }}
                        clearButtonMode="while-editing"
                    />
                </View>

                {/* Quick Add Data View */}
                {(partialQuickAddData.substance || partialQuickAddData.dose || partialQuickAddData.administrationRoute || partialQuickAddData.title) && (
                    <View style={[{maxHeight: 80, paddingVertical: 5, paddingHorizontal: 15}]}>
                        <Text style={[styles.suggestionChipText, {
                            color: metaTextColor
                        }]}>{(partialQuickAddData.dose && partialQuickAddData.administrationRoute && partialQuickAddData.substance) ? "QuickAdd Available! (Optionally Add):" : "To QuickAdd Please Specify: "}</Text>
                        {partialQuickAddData.substance ? "" :
                            <Text style={[styles.suggestionChipText, {
                                color: metaTextColor
                            }]}>Substance{((partialQuickAddData.substance ? 0 : 1) +
                                ((partialQuickAddData.dose && partialQuickAddData.units) ? 0 : 1) +
                                (partialQuickAddData.administrationRoute ? 0 : 1) +
                                (partialQuickAddData.title ? 0 : 1)) > 1 ? ", " : ""}</Text>}
                        {(partialQuickAddData.dose && partialQuickAddData.units) ? "" :
                            <Text style={[styles.suggestionChipText, {
                                color: metaTextColor
                            }]}>Dose{((partialQuickAddData.substance ? 0 : 1) +
                                ((partialQuickAddData.dose && partialQuickAddData.units) ? 0 : 1) +
                                (partialQuickAddData.administrationRoute ? 0 : 1) +
                                (partialQuickAddData.title ? 0 : 1)) > 1 ? ", " : ""}</Text>}
                        {partialQuickAddData.administrationRoute ? "" :
                            <Text style={[styles.suggestionChipText, {
                                color: metaTextColor
                            }]}>Route{((partialQuickAddData.substance ? 0 : 1) +
                                ((partialQuickAddData.dose && partialQuickAddData.units) ? 0 : 1) +
                                (partialQuickAddData.administrationRoute ? 0 : 1) +
                                (partialQuickAddData.title ? 0 : 1)) > 1 ? " and " : ""}</Text>}
                        {partialQuickAddData.title ? "" :
                            <Text style={[styles.suggestionChipText, {
                                color: metaTextColor
                            }]}>Title</Text>}

                        <Text style={[styles.suggestionChipText, {
                            color: metaTextColor
                        }]}></Text>
                    </View>
                )}

                {/* Results Count */}
                <Text style={styles.resultCount}>
                    {activeTab === 'substances'
                        ? `Found ${filteredSubstances.length} substance${filteredSubstances.length !== 1 ? 's' : ''}`
                        : `Found ${filteredExperiences.length} experience${filteredExperiences.length !== 1 ? 's' : ''}`
                    }
                </Text>

                {/* Suggestion Chips */}
                {matchingSubstances.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={[{height: 80, maxHeight: 80}]}
                        contentContainerStyle={styles.suggestionChipContainer}
                    >
                        {matchingSubstances.map((substance) => (
                            <TouchableOpacity
                                key={substance}
                                style={[styles.suggestionChip, {backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea'}]}
                                onPress={() => setSearchQuery(substance)}
                            >
                                <Text style={[styles.suggestionChipText, {color: textColor}]}>{substance}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Main Content */}
                {activeTab === 'substances' ? (
                    <FlatList
                        data={filteredSubstances}
                        ref={substanceListRef}
                        keyExtractor={(item) => item.name}
                        renderItem={renderSubstanceItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <FlatList
                        data={filteredExperiences}
                        ref={journalListRef}
                        keyExtractor={(item: Experience) => item.creationDate.toString()}
                        renderItem={renderJournalItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={true}
                    />
                )}

            </View>

            <AddSubstance
                visible={isAddSubstanceVisible}
                onClose={() => setIsAddSubstanceVisible(false)}
                onAdd={handleAddSubstance}
            />
            <TouchableOpacity
                style={[
                    styles.fab,
                    quickAddData && {backgroundColor: '#4CAF50'}
                ]}
                onPress={onFabPress}
            >
                <IconSymbol
                    name="plus"
                    size={28}
                    color="#FFFFFF"
                />
            </TouchableOpacity>
            <Toast/>
        </View>
    );
}

// --- Merged Styles ---
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        overflow: 'visible'
    },
    container: {
        flex: 1,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        // marginBottom removed
    },
    leftIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
    },
    icon: {
        marginRight: 2,
    },
    title: {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16, // Changed from 2
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        backgroundColor: '#ffffff',
        marginBottom: 8, // Added
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '400',
        ...Platform.select({
            web: {
                outline: 'none',
            },
        }),
    },
    resultCount: {
        marginHorizontal: 16, // Changed from marginLeft// Changed from marginVertical
        fontSize: 14,
        color: '#777',
    },
    listContainer: {
        paddingBottom: 150,
        paddingHorizontal: 2,
        paddingTop: 0,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    gradientBar: {
        width: 6,
        height: '100%',
        borderRadius: 4,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    // --- Substance List Item Styles ---
    listTitle: {
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 4,
    },
    listDescription: { // For substance aliases
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
        flexShrink: 1,
    },
    chipContainer: { // For category chips in substance list
        marginRight: 4,
        marginBottom: 4,
    },
    chipButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 16,
    },
    chipTitle: {
        fontSize: 10,
    },
    // --- Journal List Item Styles ---
    substances: { // For journal item substance names
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 4,
    },
    meta: {
        fontSize: 14,
    },
    date: {
        fontSize: 12,
        marginTop: 6,
    },
    // --- Suggestion Chip Styles (under search bar) ---
    suggestionChipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16, // Changed from padding
        paddingTop: 8, // Added
    },
    suggestionChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    suggestionChipText: {
        fontSize: 14
    },
    // --- Tab Styles ---
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        // marginTop: 8, // Removed
        marginBottom: 16, // Added
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent', // Inactive
    },
    tabButtonActive: {
        // Active border color set inline
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // --- FAB Style ---
    fab: {
        position: 'absolute',
        left: '50%',
        transform: [{translateX: -28}],
        bottom: '10%',
        width: 56,
        height: 56,
        backgroundColor: '#2196F3', // a blue color
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5, // for Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.18,
        shadowRadius: 4,
        zIndex: 999, // ensure it floats on top
    },
    // ...other styles
});
