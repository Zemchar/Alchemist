import React, {useEffect, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {Experience, Ingestion, Mass} from "@/constants/DataTypes";
import * as fs from 'expo-file-system';

const fileUri = fs.documentDirectory + 'experiences.json';
const substanceColors: Record<string, string> = {
    "Unknown": '#BDBDBD'
};

export default function journal() {
    const colorScheme = useColorScheme();
    const tintColor = Colors[colorScheme ?? 'light'].tint;
    const textColor = colorScheme === 'dark' ? '#fff' : '#000';
    const searchBgColor = colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f2';
    const searchPlaceholderColor = colorScheme === 'dark' ? '#666' : '#8e8e93';

    const [quickAddData, setQuickAddData] = useState<{
        substance: string,
        dose: number,
        units: string,
        title: string,
        administrationRoute: string
    } | null>(null);
    const [matchingSubstances, setMatchingSubstances] = useState<string[]>([]);

    const [searchQuery, setSearchQuery] = useState("");

    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [filteredData, setFilteredData] = useState<Experience[]>([]);

    const navigation = useNavigation();

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

    const determineGradientColors = (substanceNames: string[]): [string, string] => {
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

    // --- File System Functions ---
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
                setExperiences(data);
            } else {
                console.log("No experiences file found, loading default data.");
            }
        } catch (error) {
            console.error('Error loading experiences:', error);
            Alert.alert("Error", "Could not load experiences. Loading defaults.");
        }
    };

    // --- Effects ---
    useEffect(() => {
        loadExperiencesFromFile();
    }, []);

    useEffect(() => {
        const sortedData = [...experiences].sort((a, b) => (b.sortDate || b.creationDate) - (a.sortDate || a.creationDate));

        // Use the new regex from your file
        const quickAddRegex = /^([a-zA-Z]+)\s+(\d+(?:\.\d+)?)[a-zA-Z]+\s+[a-zA-Z]+(?:\s+.*)?$|^(\d+(?:\.\d+)?)[a-zA-Z]+\s+[a-zA-Z]+\s+[a-zA-Z]+(?:\s+.*)?$|^[a-zA-Z]+\s+[a-zA-Z]+\s+(\d+(?:\.\d+)?)[a-zA-Z]+(?:\s+.*)?$/;
        const match = searchQuery.trim().match(quickAddRegex);

        if (match) {
            const parts = searchQuery.trim().split(/\s+/);
            let substance, dose, units, administrationRoute, title;

            // Find the dose part (number + units)
            const doseIndex = parts.findIndex(part => /^\d+(?:\.\d+)?[a-zA-Z]+$/.test(part));
            const doseMatch = parts[doseIndex].match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
            if (doseMatch) {
                dose = doseMatch[1];
                units = doseMatch[2];
                // Last part is title if more than 4 parts exist
                if (parts.length > 4) {
                    title = parts.slice(4).join(' ');
                    parts.splice(4);
                }

                // The remaining parts are substance and route in whatever order they appear
                const remainingParts = parts.filter((_, i) => i !== doseIndex);
                const substances = require('@/constants/datamed/data/substances.json');
                if (substances["substances"].includes(remainingParts[0].toLowerCase())) {
                    substance = remainingParts[0];
                    administrationRoute = remainingParts[1];
                } else if (substances["substances"].includes(remainingParts[1].toLowerCase())) {
                    substance = remainingParts[1];
                    administrationRoute = remainingParts[0];
                } else {
                    setQuickAddData(null);
                    return;
                }

                setQuickAddData({administrationRoute, substance, dose: parseFloat(dose), units, title: title || ''});
            }

        } else {
            setQuickAddData(null);
        }

        if (!searchQuery.trim()) {
            setFilteredData(sortedData);
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

        setFilteredData(filtered);

    }, [searchQuery, experiences]);

    const openExperienceDetail = (experience: Experience) => {
        // @ts-ignore
        navigation.navigate('screens/ExperienceDetails', {experience});
    };

    const onFabPress = async () => {
        if (quickAddData) {
            const newExperience: Experience = {
                // @ts-ignore
                creationDate: Date.now(),
                sortDate: Date.now(),
                title: (quickAddData.title && quickAddData.title.length > 0) ? quickAddData.title : `Quick Add: ${quickAddData.substance}`,
                ingestions: [{
                    substanceName: quickAddData.substance,
                    dose: new Mass(quickAddData.dose + quickAddData.units),
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

            const updatedData = [...experiences, newExperience];
            setExperiences(updatedData);
            await saveExperiencesToFile(updatedData);
            setSearchQuery('');
        } else {
            // @ts-ignore
            navigation.navigate('screens/AddSubstance');
        }
    };
    // Effect to find matching substances
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

    const substanceChipStyles = StyleSheet.create({
        chipContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            padding: 8,
            gap: 8
        },
        chip: {
            backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
        },
        chipText: {
            color: textColor,
            fontSize: 14
        }
    });
    // --- Render Item ---
    const renderItem = ({item}: { item: Experience }) => {
        const substanceNames = extractSubstanceNames(item.ingestions);
        const consumerNames = extractConsumerNames(item.ingestions);
        const consumerText = consumerNames.length && consumerNames[0] !== 'null'
            ? `${consumerNames.join(', ')}`
            : '';
        const locationText = item.location?.name ? `${item.location.name}` : '';
        const gradientColors = determineGradientColors(substanceNames);
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
                                        color={Colors[colorScheme ?? 'light'].metaText}
                                        size={20}
                                        style={styles.icon}
                                    />
                                    <Text
                                        style={[
                                            styles.meta,
                                            {
                                                color: Colors[colorScheme ?? 'light'].metaText,
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
                            <Text style={[styles.date, {
                                color: Colors[colorScheme ?? 'light'].dateText,
                                flex: 1
                            }]}>{startTime}</Text>
                            {locationText ? (
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <IconSymbol name="mappin" size={16} color={textColor}/>
                                    <Text
                                        style={[
                                            styles.meta,
                                            {
                                                color: Colors[colorScheme ?? 'light'].metaText,
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, {color: textColor}]}>Journal</Text>
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

            <View style={[styles.searchContainer, {backgroundColor: searchBgColor}]}>
                <IconSymbol
                    name="magnifyingglass"
                    size={20}
                    color={searchPlaceholderColor}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={[styles.searchInput, {color: textColor}]}
                    placeholder="Search experiences or Quick Add"
                    placeholderTextColor={searchPlaceholderColor}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                />
            </View>
            <Text style={styles.resultCount}>
                {filteredData.length} experience{filteredData.length !== 1 ? 's' : ''}
            </Text>
            {matchingSubstances.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[{paddingVertical: 2, maxHeight: 50}]}
                    contentContainerStyle={substanceChipStyles.chipContainer}
                >
                    {matchingSubstances.map((substance) => (
                        <TouchableOpacity
                            key={substance}
                            style={substanceChipStyles.chip}
                            onPress={() => setSearchQuery(substance)}
                        >
                            <Text style={substanceChipStyles.chipText}>{substance}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}


            <FlatList
                data={filteredData}
                keyExtractor={(item: Experience) => item.creationDate.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                // @ts-ignore
                showsVerticalScrollIndicator={true}
            />
            <TouchableOpacity
                style={[styles.fab, quickAddData && {backgroundColor: '#4CAF50'}]}
                onPress={onFabPress}
            >
                <IconSymbol
                    name="plus"
                    size={28}
                    color="#FFFFFF"
                />
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 16,
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
        marginHorizontal: 2,
        borderRadius: 16,
        paddingTop: 6,
        paddingBottom: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        backgroundColor: '#ffffff',
    },
    searchIcon: {
        marginHorizontal: 12,
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
    listTitle: {
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 4
    },
    resultCount: {
        marginLeft: 16,
        marginTop: 8,
        fontSize: 14,
        color: '#777',
    },
    listContainer: {
        paddingBottom: 150, // add extra so row doesnt get hidden by tabs
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
    substances: {
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
    fab: {
        position: 'absolute',
        bottom: 95,
        left: '50%',
        marginLeft: -28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 6,
        zIndex: 1000,
    },
});