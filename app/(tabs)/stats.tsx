import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useColorScheme} from '@/hooks/useColorScheme';
import {Colors} from '@/constants/Colors';
import * as fs from 'expo-file-system';
import {Experience, Mass} from "@/constants/DataTypes";
import {useFocusEffect} from '@react-navigation/native';
import {IconSymbol} from "@/components/ui/IconSymbol";

// --- Constants ---
const fileUri = fs.documentDirectory + 'experiences.json';

// --- Type Definitions ---
type SubstanceStat = {
    name: string;
    count: number;
    doses: Mass;
};
type StatPeriod = {
    substance: string;
    count: number;
} | null;
type TopSubstances = {
    allTime: StatPeriod;
    year: StatPeriod;
    month: StatPeriod;
};

// --- Helper Functions ---

/**
 * Formats the cumulative dose map into a readable string.
 * e.g., { "mg": 150, "ug": 1000 } -> "150mg, 1000ug"
 */

/**
 * Finds the substance with the highest count from a frequency map.
 */
const findTopSubstance = (counts: Record<string, number>): StatPeriod => {
    let topSubstance: string | null = null;
    let maxCount = 0;

    for (const [substance, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            topSubstance = substance;
        }
    }

    if (!topSubstance) return null;
    return {substance: topSubstance, count: maxCount};
};
let tSubstances: { allTime: any; year: any; month: any; };
// --- Main Component ---
export default function stats() {
    // --- Hooks & State ---
    const colorScheme = useColorScheme();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<SubstanceStat[]>([]);
    const [topSubstances, setTopSubstances] = useState<TopSubstances>({
        allTime: null,
        year: null,
        month: null,
    });
    tSubstances = topSubstances
    // --- Dynamic Colors ---
    const textColor = Colors[colorScheme ?? 'light'].text;
    const bgColor = Colors[colorScheme ?? 'light'].background;
    const cardColor = Colors[colorScheme ?? 'light'].card;
    const metaColor = Colors[colorScheme ?? 'light'].metaText;

    // --- Data Processing ---
    const processStats = useCallback(async () => {
        setIsLoading(true);
        try {
            const fileInfo = await fs.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                console.log("No experiences file found.");
                setIsLoading(false);
                return;
            }

            const jsonString = await fs.readAsStringAsync(fileUri, {
                encoding: fs.EncodingType.UTF8
            });
            const experiences: Experience[] = JSON.parse(jsonString);

            // Frequency and Dose Maps
            const allTimeCounts: Record<string, number> = {};
            const yearCounts: Record<string, number> = {};
            const monthCounts: Record<string, number> = {};
            const allTimeDoses: Record<string, Mass> = {};

            // Time Cutoffs
            const now = Date.now();
            const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
            const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

            for (const exp of experiences) {
                for (const ingestion of exp.ingestions) {
                    const {substanceName, dose, units} = ingestion;
                    // Use ingestion time, fall back to experience sortDate/creationDate
                    const ingestionTime = ingestion.time || exp.sortDate || exp.creationDate;

                    // --- All-Time Stats (for List) ---
                    allTimeCounts[substanceName] = (allTimeCounts[substanceName] || 0) + 1

                    if (dose && units) {
                        if (!allTimeDoses[substanceName]) {
                            allTimeDoses[substanceName] = new Mass("0mg");
                        }
                        try {
                            // Ensure we have a valid Mass object
                            const doseMass = new Mass(dose.adjusted + dose.unit)

                            // Add the dose to the running total
                            allTimeDoses[substanceName].add(doseMass.getMassString(doseMass.unit));
                        } catch (error) {
                            console.error(`Error processing dose for ${substanceName}:`, error);
                            continue; // Skip this dose if there's an error
                        }

                    }

                    // --- Year Stats (for Trophy) ---
                    if (ingestionTime > oneYearAgo) {
                        yearCounts[substanceName] = (yearCounts[substanceName] || 0) + 1;
                    }

                    // --- Month Stats (for Trophy) ---
                    if (ingestionTime > oneMonthAgo) {
                        monthCounts[substanceName] = (monthCounts[substanceName] || 0) + 1;
                    }
                }
            }

            // --- Process Ranked List (Section 3) ---
            const rankedStats: SubstanceStat[] = Object.keys(allTimeCounts)
                .map(name => ({
                    name: name,
                    count: allTimeCounts[name],
                    doses: allTimeDoses[name] || {},
                }))
                .sort((a, b) => b.count - a.count); // Sort by count descending

            setStats(rankedStats);

            // --- Process Trophy Stand (Section 2) ---
            setTopSubstances({
                allTime: findTopSubstance(allTimeCounts),
                year: findTopSubstance(yearCounts),
                month: findTopSubstance(monthCounts),
            });

        } catch (error) {
            console.error("Error processing stats:", error);
            Alert.alert("Error", "Could not load or process stats.");
        }
        setIsLoading(false);
    }, []);

    // Load data every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            processStats();
        }, [processStats])
    );

    // --- Render Functions ---

    const renderStatItem = (item: SubstanceStat, index: number) => (
        <View style={[styles.statItemContainer, {backgroundColor: cardColor}]}>
            <Text style={[styles.statRank, {color: metaColor}]}>#{index + 1}</Text>
            <View style={styles.statItemInfo}>
                <Text style={[styles.statSubstanceName, {color: textColor}]}>{item.name}</Text>
                <Text style={[styles.statDoses, {color: metaColor}]}>
                    {item.doses.adjusted + item.doses.unit} total
                </Text>
            </View>
            <View style={styles.statItemCount}>
                <Text style={[styles.statCount, {color: textColor}]}>{item.count}</Text>
                <Text style={[styles.statCountLabel, {color: metaColor}]}>uses</Text>
            </View>
        </View>
    );

    return (
        <ScrollView style={[styles.container, {backgroundColor: bgColor}]}>
            <Text style={[styles.title, {color: textColor}]}>Statistics</Text>

            {isLoading ? (
                <ActivityIndicator size="large" style={{marginTop: 40}}/>
            ) : (
                <View style={{marginBottom: 150}}>
                    {/* --- Section 1: Tolerance Graph --- */}
                    <Text style={[styles.sectionTitle, {color: textColor}]}>Tolerance</Text>
                    <ToleranceGraph/>

                    {/* --- Section 2: Trophy Stand --- */}
                    <Text style={[styles.sectionTitle, {color: textColor}]}>Top Substances</Text>
                    <TrophyStand data={topSubstances}/>

                    {/* --- Section 3: Ranked List --- */}
                    <Text style={[styles.sectionTitle, {color: textColor}]}>All-Time Usage</Text>
                    {stats.length > 0 ? (
                        stats.map((item, index) => (
                            <View
                                key={`${item.name}-${index}`} // Add this unique key
                                style={[styles.statItemContainer, {backgroundColor: cardColor}]}
                            >
                                <Text style={[styles.statRank, {color: metaColor}]}>#{index + 1}</Text>
                                <View style={styles.statItemInfo}>
                                    <Text style={[styles.statSubstanceName, {color: textColor}]}>{item.name}</Text>
                                    <Text style={[styles.statDoses, {color: metaColor}]}>
                                        {item.doses.adjusted + item.doses.unit} total
                                    </Text>
                                </View>
                                <View style={styles.statItemCount}>
                                    <Text style={[styles.statCount, {color: textColor}]}>{item.count}</Text>
                                    <Text style={[styles.statCountLabel, {color: metaColor}]}>uses</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.placeholderText, {color: metaColor}]}>
                            No experiences recorded yet.
                        </Text>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

// --- Helper Components ---

const ToleranceGraph = () => {
    const {card, metaText} = useDynamicColors();
    return (
        <View style={[styles.placeholder, {backgroundColor: card}]}>
            <IconSymbol name="chart.line.uptrend.xyaxis" size={40} color={metaText}/>
            <Text style={[styles.placeholderText, {color: metaText}]}>
                Tolerance graphing is a complex feature coming soon.
            </Text>
        </View>
    );
};

const TrophyStand = ({data}: { data: TopSubstances }) => {
    const {card} = useDynamicColors();

    // Podium colors
    const colors = {
        gold: '#FFD700',
        silver: '#C0C0C0',
        bronze: '#CD7F32'
    };

    return (
        <View style={[styles.trophyContainer, {backgroundColor: card}]}>
            {/* 3rd Place: Past Month */}
            <TrophyPodium
                period="Past Month"
                stat={data.month}
                color={colors.bronze}
            />
            {/* 2nd Place: Past Year */}
            <TrophyPodium
                period="Past Year"
                stat={data.year}
                color={colors.silver}
            />
            {/* 1st Place: All Time */}
            <TrophyPodium
                period="All Time"
                stat={data.allTime}
                color={colors.gold}
            />
        </View>


    );
};
let trophyPodiumRanks = []
const TrophyPodium = ({period, stat, color}: {
    period: string,
    stat: StatPeriod,
    color: string,
}) => {
    const {text, metaText, card} = useDynamicColors();
    return (
        <View style={styles.podiumWrapper}>
            {stat?.count === Math.max(tSubstances?.allTime?.count || 0,
                tSubstances?.year?.count || 0,
                tSubstances?.month?.count || 0
            ) && <IconSymbol name={"trophy"} color={text}/>}
            <Text style={[styles.podiumPeriod, {color: text}]}>{period}</Text>
            <View style={[styles.podiumBase, {
                height: Math.min(20 + 5 * (stat?.count || 0), 200),
                backgroundColor: color
            }]}>
                <Text style={styles.podiumOrder}>{stat?.count}</Text>

            </View>
            <View style={[styles.podiumInfo, {backgroundColor: card}]}>
                <Text style={[styles.podiumSubstance, {color: text}]} numberOfLines={1}>
                    {stat?.substance || 'N/A'}
                </Text>
                <Text style={[styles.podiumCount, {color: metaText}]}>
                </Text>
            </View>
        </View>
    );
};

// --- Utility hook for dynamic colors in helpers ---
const useDynamicColors = () => {
    const colorScheme = useColorScheme();
    return {
        text: Colors[colorScheme ?? 'light'].text,
        metaText: Colors[colorScheme ?? 'light'].metaText,
        card: Colors[colorScheme ?? 'light'].card,
    };
};


// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        marginTop: 60,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 12,
    },
    // --- Placeholder Styles ---
    placeholder: {
        height: 150,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    placeholderText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
    },
    // --- Trophy Stand Styles ---
    trophyContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
        paddingBottom: 0,
        borderRadius: 12,
        height: 250,
    },
    podiumWrapper: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    podiumBase: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    podiumOrder: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'rgba(0,0,0,0.4)',
        position: 'absolute',
    },
    podiumIcon: {
        opacity: 0.3,
    },
    podiumInfo: {
        width: '100%',
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: 'center',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    podiumPeriod: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 6,
    },
    podiumSubstance: {
        fontSize: 14,
        fontWeight: '600',
    },
    podiumCount: {
        fontSize: 12,
    },
    // --- Ranked List Styles ---
    statItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    statRank: {
        fontSize: 16,
        fontWeight: '600',
        width: 40,
    },
    statItemInfo: {
        flex: 1,
        marginRight: 12,
    },
    statSubstanceName: {
        fontSize: 17,
        fontWeight: '500',
    },
    statDoses: {
        fontSize: 13,
        marginTop: 2,
    },
    statItemCount: {
        alignItems: 'flex-end',
    },
    statCount: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statCountLabel: {
        fontSize: 12,
    },
});