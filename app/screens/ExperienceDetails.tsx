import React, {useEffect, useState} from 'react';
import {Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {Experience, Ingestion, Mass} from '@/constants/DataTypes';
import {useNavigation, useRoute} from '@react-navigation/native';
import {IconSymbol} from "@/components/ui/IconSymbol";
import {Colors} from "@/constants/Colors";
import {useColorScheme} from "@/hooks/useColorScheme";
import {LinearGradient} from 'expo-linear-gradient';
import {AreaChart, DataPoint} from "@/components/AreaChart";
// Assuming AreaChart component exists as seen in SubstanceDetails.tsx
// Import substance data - ** PLEASE VERIFY THIS PATH **
import substanceData from '@/constants/datamed/data/data.json';

const { width } = Dimensions.get('window');

interface ExperienceDetailsRouteProps {
  params: {
    experience: Experience;
  };
}

// --- Helper Functions ---

/**
 * Parses duration strings (e.g., "1-2", "30-60") into an average number of minutes.
 */
const parseDurationToMinutes = (valueStr: string, unit: string): number => {
  if (!valueStr) return 0;

  const parts = valueStr.split('-').map(Number);
  const avg = parts.length > 1 ? (parts[0] + parts[1]) / 2 : parts[0];

  if (unit === 'hours') {
    return avg * 60;
  }
  return avg; // Assumes minutes otherwise
};

/**
 * Calculates the start time, end time, and duration for a single ingestion.
 */
const getIngestionTimeline = (ingestion: Ingestion, allSubstanceData: any) => {
  // Use ingestion.time as per JournalScreen.tsx
  const startTime = ingestion.time || ingestion.creationDate || Date.now();
  const substanceName = ingestion.substanceName.toLowerCase();
  // @ts-ignore
  const substanceInfo = allSubstanceData[substanceName]?.tripsit;

  if (!substanceInfo) {
    // Default duration (e.g., 60 mins) if substance is unknown
    return {startTime, endTime: startTime + 60 * 60 * 1000, durationMinutes: 60, substanceInfo: null};
  }

  const timing = substanceInfo.timing;
  const onset = parseDurationToMinutes(timing.onset?.value?.value, timing.onset?.value?.unit);
  const duration = parseDurationToMinutes(timing.duration?.value?.value, timing.duration?.value?.unit);
  const aftereffects = parseDurationToMinutes(timing.aftereffects?.value?.value, timing.aftereffects?.value?.unit);

  const totalDurationMinutes = onset + duration + aftereffects;
  const endTime = startTime + totalDurationMinutes * 60 * 1000; // Convert minutes to ms

  return {startTime, endTime, totalDurationMinutes, substanceInfo};
};

// Simple color generation for substances
const substanceColors: Record<string, string> = {
  "mdpa": '#FF6B6B',
  "cannabis": '#4ECDC4',
  "maois": '#45B7D1',
  "default": '#BDBDBD',
};
const getSubstanceColor = (substanceName: string) => {
  return substanceColors[substanceName.toLowerCase()] || substanceColors.default;
};

// Mock Component for the timeline indicator
const CurrentTimeLine = ({progress}: { progress: number }) => (
    <View style={[styles.mockTimeLine, {left: `${progress * 100}%`}]}/>
);

export default function ExperienceDetails() {
  // @ts-ignore
  const route = useRoute<ExperienceDetailsRouteProps>();
  const { experience } = route.params;
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [currentTime, setCurrentTime] = useState(Date.now());

  // --- Processed Data State ---
  const [timeline, setTimeline] = useState({start: 0, end: 0, duration: 0, elapsed: 0, remaining: 0, progress: 0});
  const [cumulativeDoses, setCumulativeDoses] = useState<Record<string, {
    totalDose: Mass,
    unit: string,
    route: string
  }>>({});
  const [interactions, setInteractions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<Record<string, DataPoint[]>>({});
  useEffect(() => {
    // Update current time every 10 seconds
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!experience || !substanceData) return;

    // --- 1. Calculate Timelines ---
    const ingestionTimelines = experience.ingestions.map(ing => {
      const substance = substanceData[ing.substanceName.toLowerCase()];
      if (!substance?.psychonautwiki?.timing) {
        return {startTime: ing.time, endTime: ing.time + 60 * 60 * 1000}; // Default 1 hour
      }

      const timing = substance.psychonautwiki.timing;
      const route = ing.administrationRoute.toLowerCase();

      // Get durations in hours
      const onsetRange = timing.onset?.[route]?.value?.split('-').map(Number) || [0];
      const onsetHours = Math.max(...onsetRange) * (timing.onset?.[route]?.unit === 'hours' ? 1 : 0.016);

      const durationRange = timing.duration?.[route]?.value?.split('-').map(Number) || [0];
      const durationHours = Math.max(...durationRange) * (timing.duration?.[route]?.unit === 'hours' ? 1 : 0.016);

      const afterRange = timing.aftereffects?.[route]?.value?.split('-').map(Number) || [0];
      const afterHours = afterRange[0] * (timing.aftereffects?.[route]?.unit === 'hours' ? 1 : 0.016);

      const totalHours = onsetHours + durationHours + afterHours;
      return {
        startTime: ing.time,
        endTime: ing.time + (totalHours * 60 * 60 * 1000) // Convert hours to ms
      };
    });
    const overallStartTime = Math.min(...ingestionTimelines.map(t => t.startTime));
    const overallEndTime = Math.max(...ingestionTimelines.map(t => t.endTime));
    const totalDuration = overallEndTime - overallStartTime;

    if (totalDuration <= 0) { // Avoid divide by zero
      setTimeline({start: overallStartTime, end: overallEndTime, duration: 0, elapsed: 0, remaining: 0, progress: 1});
      return;
    }

    const elapsed = currentTime - overallStartTime;
    const remaining = overallEndTime - currentTime;
    const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

    setTimeline({
      start: overallStartTime,
      end: overallEndTime,
      duration: totalDuration,
      elapsed,
      remaining,
      progress,
    });

    // --- 2. Create Mock Chart Data (replace with real intensity curves) ---
    // A real implementation would generate intensity curves for each substance and sum them.

    const cDat: Record<string, DataPoint[]> = {};
    experience.ingestions.forEach(ing => {
      const substance = substanceData[ing.substanceName.toLowerCase()];
      if (!substance?.psychonautwiki?.timing) return;

      const timing = substance.psychonautwiki.timing;
      // Get onset duration (use longer time)
      const onsetRange = timing.onset?.[ing.administrationRoute.toLowerCase()]?.value?.split('-').map(Number) || [0];
      const onsetMultiplier = timing.onset?.[ing.administrationRoute.toLowerCase()]?.unit === 'hours' ? 1 : 0.016;
      const onsetDuration = parseFloat((Math.max(...onsetRange) * onsetMultiplier).toFixed(1));

      // Get total duration (use longer time) 
      const durationRange = timing.duration?.[ing.administrationRoute.toLowerCase()]?.value?.split('-').map(Number) || [0];
      const durationMultiplier = (timing.duration?.[ing.administrationRoute.toLowerCase()]?.unit === 'hours' ? 1 : 0.016);
      const peakDuration = parseFloat(Math.max(...durationRange) * durationMultiplier.toFixed(1));

      // Get aftereffects (use lower range)
      const afterRange = timing.aftereffects?.[ing.administrationRoute.toLowerCase()]?.value?.split('-').map(Number) || [0];
      const afterMultiplier = timing.aftereffects?.[ing.administrationRoute.toLowerCase()]?.unit === 'hours' ? 1 : 0.016;
      const afterDuration = parseFloat((afterRange[0] * afterMultiplier).toFixed(1));
      console.log(afterDuration + onsetDuration + peakDuration)
      const times = [onsetDuration, onsetDuration + peakDuration, onsetDuration + peakDuration + afterDuration]
      console.log(times)

      let intensityMax = 4;
      // if(new Mass(substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.heavy+substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.units).base <= ing.dose.base) {intensityMax = 4;}
      // else if(new Mass(substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.strong.min+substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.units).base <= ing.dose.base) {intensityMax=3;}
      // else if(new Mass(substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.common.min+substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.units).base <= ing.dose.base) {intensityMax=2;}
      // else if(new Mass(substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.light.min+substance.psychonautwiki.dosage.routes[ing.administrationRoute.toLowerCase()]?.units).base <= ing.dose.base) {intensityMax=1;}
      // else {intensityMax = 0;}
      cDat[ing.substanceName.toLowerCase()] = [
        {time: 0, intensity: 0},
        {
          time: times[0],
          intensity: intensityMax
        },
        {
          time: times[1],
          intensity: intensityMax
        },
        {time: times[2], intensity: 0}
      ];
    });
    console.log(cDat)
    setChartData(cDat);

    // --- 3. Calculate Cumulative Doses ---
    const doses: Record<string, { totalDose: Mass, unit: string, route: string }> = {};
    experience.ingestions.forEach(ing => {
      const name = ing.substanceName;
      const dose = ing.dose || 0;
      if (doses[name]) {
        if (!(doses[name].totalDose instanceof Mass)) {
          doses[name].totalDose = new Mass("0mg")
        }
        doses[name].totalDose.add(dose.adjusted + dose.unit);
      } else {
        doses[name] = {
          totalDose: dose,
          unit: ing.units || 'units',
          route: ing.administrationRoute || 'Unknown'
        };
      }
    });
    setCumulativeDoses(doses);

    // --- 4. Calculate Interactions ---
    const substanceNames = Object.keys(doses).map(s => s.toLowerCase());
    const allSubstanceInfo = substanceNames.map(name => ({
      name,
      tags: [...new Set([
        ...substanceData[name]?.psychonautwiki?.categories || [],
        ...substanceData[name]?.tripsit?.categories || []
      ])]
    }));

    const foundInteractions = new Set();

    if (allSubstanceInfo.length > 1) {
      for (let i = 0; i < allSubstanceInfo.length - 1; i++) {
        for (let j = i + 1; j < allSubstanceInfo.length; j++) {
          const [subA, subB] = [allSubstanceInfo[i], allSubstanceInfo[j]];
          const [dataA, dataB] = [substanceData[subA.name], substanceData[subB.name]];
          const [nameA, nameB] = [
            dataA?.tripsit?.name || subA.name,
            dataB?.tripsit?.name || subB.name
          ];
          const [sortedA, sortedB] = [nameA, nameB].sort();
          const key = sortedA + '-' + sortedB;

          ['dangerous', 'unsafe', 'caution'].forEach(level => {
            const interactions = [
              ...dataA?.tripsit?.interactions?.[level] || [],
              ...dataA?.psychonautwiki?.interactions?.[level] || [],
              ...dataB?.tripsit?.interactions?.[level] || [],
              ...dataB?.psychonautwiki?.interactions?.[level] || []
            ];

            interactions.forEach(int => {
              if (!int) return;
              const intName = int.toLowerCase();
              if ((subA.name === intName || subA.tags.includes(intName)) ||
                  (subB.name === intName || subB.tags.includes(intName))) {
                foundInteractions.add(JSON.stringify({
                  level,
                  nameA: sortedA,
                  nameB: sortedB,
                  key: key + '-' + level,
                  note: int.note || ""
                }));
              }
            });
          });
        }
      }
    }

    setInteractions(Array.from(foundInteractions).map(i => JSON.parse(i)).sort((a, b) => {
      if (a.level === 'dangerous' && b.level !== 'dangerous') return -1;
      if (b.level === 'dangerous' && a.level !== 'dangerous') return 1;
      if (a.level === 'unsafe' && b.level === 'caution') return -1;
      if (b.level === 'unsafe' && a.level === 'caution') return 1;
      return 0;
    }));
  }, [experience, substanceData])
  if (!experience) {
    // ... (existing error view from user upload)
    return (
        <SafeAreaView style={[styles.safeArea, {backgroundColor: colors.background}]}>
          <View style={[styles.header, {borderColor: colors.border}]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <IconSymbol name="chevron.left" size={28} color={colors.text}/>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: colors.text}]}>How did we get here?</Text>
          </View>
          <ScrollView style={styles.scrollView}>
            <Text style={{color: colors.text, padding: 16}}>Hmmm... No experience was found</Text>
          </ScrollView>
        </SafeAreaView>
    );
  }


  const activeSubstances = Object.keys(cumulativeDoses);
  const remainingTimeMinutes = Math.floor(timeline.remaining / 60000);
  const remainingHours = Math.floor(remainingTimeMinutes / 60);
  const remainingMins = remainingTimeMinutes % 60;

  return (
      <SafeAreaView style={[styles.safeArea, {backgroundColor: colors.background}]}>
        {/* --- Header --- */}
        <View style={[styles.header, {borderColor: colors.border}]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <IconSymbol name="chevron.left" size={28} color={colors.text}/>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.text}]}>{experience.title || 'Unnamed Experience'}</Text>
        </View>

        <ScrollView style={styles.scrollView}>

          {/* --- Duration Graph --- */}
          <View style={[styles.sectionContainer, styles.graphContainer, {borderColor: colors.border}]}>
            {timeline.remaining > 0 ? (
                <Text style={[styles.graphSubtitle, {color: colors.text}]}>
                  <Text style={{fontWeight: 'bold'}}>{remainingHours}h {remainingMins}m</Text> remaining
                </Text>
            ) : (
                <Text style={[styles.graphSubtitle, {color: colors.text}]}>Experience complete</Text>
            )}
            <AreaChart data={chartData} startTime={new Date(experience.ingestions[0]?.time)}/>

            {/* Timeline Labels */}
            <View style={styles.timelineLabels}>
              <Text
                  style={[styles.timelineText, {color: colors.metaText}]}>{new Date(timeline.start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}</Text>
              <Text
                  style={[styles.timelineText, {color: colors.metaText}]}>{new Date(timeline.end).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}</Text>
            </View>
          </View>

          {/*/!* --- Active Substances --- *!/*/}
          {/*<View style={[styles.sectionContainer, { borderColor: colors.border }]}>*/}
          {/*  <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Substances</Text>*/}
          {/*  {activeSubstances.map(name => {*/}
          {/*    const color = getSubstanceColor(name);*/}
          {/*    const data = cumulativeDoses[name];*/}
          {/*    // TODO: Calculate current intensity based on timeline*/}
          {/*    const intensity = "Peak"; // Mock intensity*/}

          {/*    return (*/}
          {/*        <View key={name} style={[styles.chip, { backgroundColor: colors.background }]}>*/}
          {/*          <View style={[styles.chipDot, { backgroundColor: color }]} />*/}
          {/*          <View style={styles.chipMain}>*/}
          {/*            <View style={styles.chipRow}>*/}
          {/*              /!* @ts-ignore *!/*/}
          {/*              <Text style={[styles.substanceName, { color: colors.text }]}>{ing.substanceName}</Text>*/}
          {/*              <Text style={[styles.intensityText, { color: color }]}>{intensity}</Text>*/}
          {/*            </View>*/}
          {/*            <View style={styles.chipRow}>*/}
          {/*              <Text style={[styles.doseText, { color: colors.text }]}>{data.totalDose.adjusted}{data.totalDose.unit}</Text>*/}
          {/*              <Text style={[styles.routeText, { color: colors.metaText }]}>{data.route}</Text>*/}
          {/*            </View>*/}
          {/*          </View>*/}
          {/*        </View>*/}
          {/*    );*/}
          {/*  })}*/}
          {/*</View>*/}

          {/* --- Ingestion Log --- */}
          <View style={[styles.sectionContainer, {borderColor: colors.border}]}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>Ingestion Log</Text>
            {experience.ingestions.sort((a, b) => (a.time || 0) - (b.time || 0)).map((ing, index) => {
              const color = getSubstanceColor(ing.substanceName);
              const now = Date.now();
              const {startTime, endTime} = getIngestionTimeline(ing, substanceData);
              const isActive = now >= startTime && now <= endTime;
              return (
                  <View key={index} style={[styles.logRow, {backgroundColor: colors.background}]}>
                    <LinearGradient colors={[color, `${color}80`]} style={styles.logBar}/>
                    <View style={styles.logContent}>
                      <Text style={[styles.logTime, {color: colors.metaText}]}>
                        {new Date(ing.time || 0).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        {isActive && <Text style={{color: color}}> • Active</Text>}
                      </Text>
                      <Text style={[styles.logSubstance, {color: colors.text}]}>{ing.substanceName}</Text>
                      <Text
                          style={[styles.logDose, {color: colors.text}]}>{ing.dose.adjusted}{ing.dose.unit} ({ing.administrationRoute || 'Unknown'})</Text>
                    </View>
                  </View>
              );
            })}
          </View>

          {/* --- Interactions --- */}
          <View style={[styles.sectionContainer, {borderColor: colors.border, borderBottomWidth: 0}]}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>Interactions</Text>
            {interactions.length === 0 && (
                <Text style={[styles.infoText, {color: colors.metaText}]}>
                  {activeSubstances.length > 1 ? "No known interactions found." : "No interactions to check."}
                </Text>
            )}
            {interactions.map((interaction, index) => {
              const levelColor = interaction.level === 'dangerous' ? '#FF3B30' : interaction.level === 'unsafe' ? '#FF9500' : '#FFCC00';
              return (
                  <View key={index}
                        style={[styles.interactionCard, {borderColor: levelColor, backgroundColor: colors.background}]}>
                    <Text
                        style={[styles.interactionLevel, {
                          color: levelColor,
                          textAlign: 'center',
                          fontSize: 14
                        }]}>{interaction.level.toUpperCase()}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                      <Text style={[styles.interactionText, {
                        color: colors.text,
                        fontWeight: 'bold',
                        flex: 1
                      }]}>{interaction.nameA.toUpperCase()}</Text>
                      <IconSymbol name="arrow.right.arrow.left" size={24} color={levelColor}
                                  style={{marginHorizontal: 8}}/>
                      <Text style={[styles.interactionText, {
                        color: colors.text,
                        fontWeight: 'bold',
                        flex: 1,
                        textAlign: 'right'
                      }]}>{interaction.nameB.toUpperCase()}</Text>
                    </View>
                    {interaction.note && (
                        <Text style={[styles.interactionNote, {color: colors.text}]}>{interaction.note}</Text>
                    )}
                  </View>
              );
            })}
          </View>

          {/* Bottom spacer */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  sectionContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  graphContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16, // Add padding for titles
  },
  graphTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  graphSubtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  mockChart: {
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mockChartText: {
    color: '#999',
    fontSize: 16,
  },
  mockTimeLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'red',
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timelineText: {
    fontSize: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 16, // Add horizontal margin
  },
  chipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  chipMain: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  substanceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  intensityText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  doseText: {
    fontSize: 14,
  },
  routeText: {
    fontSize: 14,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 16, // Add horizontal margin
  },
  logBar: {
    width: 8,
    alignSelf: 'stretch',
  },
  logContent: {
    flex: 1,
    padding: 12,
  },
  logTime: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  logSubstance: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logDose: {
    fontSize: 14,
  },
  interactionCard: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 16, // Add horizontal margin
  },
  interactionLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  interactionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  interactionNote: {
    fontSize: 14,
  },
  infoText: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingHorizontal: 16, // Add padding
  }
});