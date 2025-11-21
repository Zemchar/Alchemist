import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,} from 'react-native';
import {IconSymbol} from '@/components/ui/IconSymbol';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {LinearGradient} from 'expo-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {MergedSubstanceData, RawSubstanceData} from "@/constants/DataTypes";
import {Chip} from '@rneui/themed';

const rawSubstanceData: RawSubstanceData = require('@/constants/datamed/data/data.json');

const substanceColors: Record<string, string> = {
    "Unknown": '#BDBDBD',
};

export default function SubstanceScreen() {
    const colorScheme = useColorScheme();
    const tintColor = Colors[colorScheme ?? 'light'].tint;
    const textColor = Colors[colorScheme ?? 'light'].text;
    const searchBgColor = Colors[colorScheme ?? 'light'].background;
    const searchPlaceholderColor = Colors[colorScheme ?? 'light'].searchPlaceholder
    const [searchQuery, setSearchQuery] = useState("");
    // filteredData will now hold MergedSubstanceData objects
    const [filteredData, setFilteredData] = useState<MergedSubstanceData[]>([]);
    const navigation = useNavigation();
    const listRef = useRef(null);
    // --- Data Processing Functions ---

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

    /**
     * Processes raw datamed data json and merges it into usable data structures. Favors data from psychonaut wiki as it typically has the most thourough data.
     * Both sets of data are retainable.
     * @param rawData
     */
    const processSubstanceData = (rawData: RawSubstanceData): MergedSubstanceData[] => {
        const processed: MergedSubstanceData[] = [];
        for (const substanceKey in rawData) {
            if (rawData.hasOwnProperty(substanceKey)) {
                const substanceEntry = rawData[substanceKey];
                const psychonautwikiData = substanceEntry.psychonautwiki;
                const tripsitData = substanceEntry.tripsit;

                // Initialize merged data with PsychonautWiki data if available
                // Otherwise, use Tripsit data. If neither, it's an empty shell.
                const merged: MergedSubstanceData = {
                    ...(psychonautwikiData || tripsitData), // Spread PW data, or TS if PW is null/undefined
                    // Store original data sources for detail screen access
                    psychonautwikiData: psychonautwikiData,
                    tripsitData: tripsitData,
                } as MergedSubstanceData; // Cast to MergedSubstanceData

                // Now, selectively fill missing fields from Tripsit data where PW is absent/empty
                if (tripsitData) {
                    // Primitive fields: prefer PW, fallback to TS
                    merged.name = merged.name || tripsitData.name;
                    merged.pretty_name = merged.pretty_name || tripsitData.pretty_name;

                    // Arrays: merge, prioritizing PW, and de-duplicate
                    merged.aliases = mergeArrays(psychonautwikiData?.aliases, tripsitData.aliases);
                    merged.categories = mergeArrays(psychonautwikiData?.categories, tripsitData.categories);
                    merged.effects = mergeArrays(psychonautwikiData?.effects, tripsitData.effects);

                    // Properties: Summary is a key field we want to merge
                    merged.properties = {
                        ...(psychonautwikiData?.properties || tripsitData.properties),
                        summary: psychonautwikiData?.properties?.summary || tripsitData.properties?.summary || "",
                        avoid: psychonautwikiData?.properties?.avoid || tripsitData.properties?.avoid || "",
                        test_kits: psychonautwikiData?.properties?.test_kits || tripsitData.properties?.test_kits || "",
                        half_life: psychonautwikiData?.properties?.half_life || tripsitData.properties?.half_life || "",
                        note: psychonautwikiData?.properties?.note || tripsitData.properties?.note || "",
                        warnings: mergeArrays(psychonautwikiData?.properties?.warnings, tripsitData.properties?.warnings),
                    };

                    // Interactions: Dangerous, Unsafe, Caution arrays
                    if (psychonautwikiData?.interactions || tripsitData.interactions) {
                        merged.interactions = {
                            dangerous: mergeArrays(psychonautwikiData?.interactions?.dangerous, tripsitData.interactions?.dangerous),
                            unsafe: mergeArrays(psychonautwikiData?.interactions?.unsafe, tripsitData.interactions?.unsafe),
                            caution: mergeArrays(psychonautwikiData?.interactions?.caution, tripsitData.interactions?.caution),
                        };
                    } else {
                        merged.interactions = {dangerous: [], unsafe: [], caution: []};
                    }


                    // Metadata: source_url specifically
                    merged.metadata = {
                        ...(psychonautwikiData?.metadata || tripsitData.metadata),
                        source_url: psychonautwikiData?.metadata?.source_url || tripsitData.metadata?.source_url || "",
                    };

                    // Copy other top-level objects if they only exist in tripsitData
                    if (!merged.timing && tripsitData.timing) merged.timing = tripsitData.timing;
                    if (!merged.dosage && tripsitData.dosage) merged.dosage = tripsitData.dosage;
                    if (!merged.links && tripsitData.links) merged.links = tripsitData.links;
                    if (!merged.legal_status && tripsitData.legal_status) merged.legal_status = tripsitData.legal_status;

                    // Detailed Effects: Assuming PW has more comprehensive, so if PW has it, use it, else TS
                    merged.effects_detailed = (psychonautwikiData?.effects_detailed && psychonautwikiData.effects_detailed.length > 0)
                        ? psychonautwikiData.effects_detailed
                        : tripsitData.effects_detailed;
                }

                // Ensure basic properties are always present, even if no source has them
                merged.name = merged.name || substanceKey; // Fallback to the key name if nothing else
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

    const determineGradientColors = (substanceName: string): [string, string] => {
        const color = substanceColors[substanceName.toLowerCase()] || substanceColors["Unknown"];
        return [color, color];
    };

    // Search logic
    useEffect(() => {
        const allSubstances = processSubstanceData(rawSubstanceData);

        const sortedData = [...allSubstances].sort((a, b) =>
            (a.pretty_name || a.name).localeCompare(b.pretty_name || b.name)
        );

        if (!searchQuery.trim()) {
            setFilteredData(sortedData);
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

        setFilteredData(filtered);

    }, [searchQuery]);

    /**
     * Shorthand to navigate to the substance details page.
     * @param {MergedSubstanceData} substance - takes in a MergedSubstanceData object to pass along to the details screen
     */
    const openSubstanceDetail = (substance: MergedSubstanceData) => {
        // @ts-ignore
        navigation.navigate('screens/SubstanceDetails', {substance});
    };

    // --- Render Item ---
    const renderItem = ({item}: { item: MergedSubstanceData }) => {
        const title = item.pretty_name || item.name || "Unnamed Substance";
        const gradientColors = determineGradientColors(item.name);

        return (
            <TouchableOpacity
                style={[styles.itemContainer, {backgroundColor: searchBgColor}]}
                onPress={() => {
                    openSubstanceDetail(item)
                }}
            >
                {/* Vertical gradient bar on the left */}
                <LinearGradient colors={gradientColors} style={styles.gradientBar}/>

                {/* Content section */}
                <View style={styles.content}>
                    {/* Title (Pretty Name) */}
                    <Text style={[styles.listTitle, {color: textColor}]}>{title}</Text>

                    {/* Short Description (Summary) */}
                    {item.aliases?.length > 0 &&
                        <Text style={[styles.listDescription, {color: Colors[colorScheme ?? 'light'].metaText}]}>
                            {item.aliases.join(', ')}
                        </Text>
                    }

                    {/* Meta information: Categories and PsychonautWiki Source */}
                    <View style={styles.metaRow}>
                        {item.categories.map((category, index) => (
                            <Chip
                                containerStyle={styles.chipContainer} // Apply consistent margin/padding here
                                titleStyle={[styles.chipTitle, {color: textColor}]} // Control text size here
                                buttonStyle={[ // Apply background/border here
                                    styles.chipButton,
                                ]}
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
                {/* Arrow Icon */}
                <IconSymbol name="chevron.forward" size={24} color="#aaa"/>
            </TouchableOpacity>
        );
    };

    const searchBarStyle = useMemo(() => [
        styles.searchContainer,
        {
            backgroundColor: searchBgColor,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
        }
    ], [searchBgColor, colorScheme]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, {color: textColor}]}>Substances</Text>
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
                    placeholder="Search substances for names or categories"
                    placeholderTextColor={searchPlaceholderColor}
                    value={searchQuery}
                    onChangeText={(text: string) => {
                        setSearchQuery(text); // @ts-ignore
                        listRef.current.scrollToOffset({offset: 0, animated: false});
                    }}
                    clearButtonMode="always"
                />
            </View>

            {/* Results Count */}
            <Text style={styles.resultCount}>
                Found {filteredData.length} substance{filteredData.length !== 1 ? 's' : ''}
            </Text>

            {/* Substances List */}
            <FlatList
                data={filteredData}
                ref={listRef}
                keyExtractor={(item) => item.name}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
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
    listTitle: {
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 4,
    },
    listDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    resultCount: {
        marginLeft: 16,
        marginVertical: 8,
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
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start', // Align chips to the start
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap', // Allow chips to wrap to the next line
        flexShrink: 1, // Keep this if you want the row to shrink and wrap
    },
    meta: {
        fontSize: 14,
        // This style is likely no longer used for the categories themselves
        // as they are now chips. This might apply to other meta text if any.
    },
    // New styles for the chips
    chipContainer: {
        marginRight: 4, // Spacing between chips
        marginBottom: 4, // Spacing for wrapped chips
        // minWidth: 0, // Allow chip to shrink to content
    },
    chipButton: {
        paddingVertical: 4, // Smaller vertical padding inside chip
        paddingHorizontal: 8, // Smaller horizontal padding inside chip
        borderRadius: 16, // More rounded corners for small chips
    },
    chipTitle: {
        fontSize: 10, // Much smaller font size for the chip text
        // You can set the color here if you want it distinct from the buttonStyle
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