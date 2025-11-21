import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as fs from 'expo-file-system';
import {Experience, Ingestion, Mass} from '@/constants/DataTypes';
import {IconSymbol} from '@/components/ui/IconSymbol';
import Toast from 'react-native-toast-message';
import substanceData from '@/constants/datamed/data/data.json';

export interface AddSubstanceProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (data: SubstanceIngestionData) => void;
}

export interface SubstanceIngestionData {
    substance: string;
    route: string;
    dose: number;
    units: string;
    timestamp: Date;
    experienceId: string | null;
    notes: string;
    user: string;
}

// Add this interface for substance search results
interface SubstanceSearchResult {
    name: string;
    pretty_name: string;
    color: string;
}

// Add this interface for route options
interface RouteOption {
    name: string;
    available: boolean;
    units: string;
}

// ... previous imports remain the same

interface DosageRange {
    min: number | null;
    max: number | null;
    color: string;
}

interface DosageRanges {
    threshold: DosageRange;
    light: DosageRange;
    common: DosageRange;
    strong: DosageRange;
    heavy: DosageRange;
}

// ... previous imports and interfaces remain the same

interface ExperienceOption {
    id: string | null;
    title: string;
    timestamp: number;
}

// Function to process substance data and get routes
const getAvailableRoutes = (substanceName: string) => {
    const substance = substanceData[substanceName.toLowerCase()];
    if (!substance) return [];

    const routes: { name: string; available: boolean; units: string }[] = [];
    const dosageData = substance.psychonautwiki?.dosage?.routes || substance.tripsit?.dosage?.routes || {};

    Object.entries(dosageData).forEach(([route, data]) => {
        routes.push({
            name: route,
            available: true,
            units: (data as any).units || 'mg'
        });
    });

    return routes;
};

// Add submit handler

export default function AddSubstance({visible, onClose, onAdd}: AddSubstanceProps) {
    const [newExperienceName, setNewExperienceName] = useState('');

    const handleSubmit = async (data: SubstanceIngestionData) => {
        try {
            const fileUri = `${fs.documentDirectory}experiences.json`;
            const fileInfo = await fs.getInfoAsync(fileUri);

            let experiences: Experience[] = [];
            if (fileInfo.exists) {
                const jsonString = await fs.readAsStringAsync(fileUri);
                experiences = JSON.parse(jsonString);
            }

            const newIngestion: Ingestion = {
                dose: new Mass(`${data.dose}${data.units}`),
                substanceName: data.substance,
                units: data.units,
                administrationRoute: data.route,
                time: data.timestamp.getTime(),
                notes: data.notes,
                creationDate: Date.now(),
                consumerName: data.user,
                endTime: null,
                isDoseAnEstimate: false,
                estimatedDoseStandardDeviation: null,
                customUnitId: null,
                stomachFullness: null
            };

            if (data.experienceId) {
                // Add to existing experience
                const experienceIndex = experiences.findIndex(e => e.title === data.experienceId);
                if (experienceIndex !== -1) {
                    experiences[experienceIndex].ingestions.push(newIngestion);
                }
            } else {
                // Create new experience
                const newExperience: Experience = {
                    location: null,
                    timedNotes: [],
                    sortDate: data.timestamp.getTime(),
                    isFavorite: false,
                    ingestions: [newIngestion],
                    text: data.notes,
                    creationDate: Date.now(),
                    ratings: [],
                    title: (newExperienceName.length === 0) ? `${new Date(Date.now()).toDateString()}` : newExperienceName,
                    fullJSON: ''
                };
                experiences.push(newExperience);
            }

            await fs.writeAsStringAsync(fileUri, JSON.stringify(experiences));
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Substance added successfully'
            });
            return true;
        } catch (error) {
            console.error('Error saving substance:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to save substance'
            });
            return false;
        }
    };
    const colorScheme = useColorScheme();
    const [step, setStep] = useState(1);
    const slideAnimation = useRef(new Animated.Value(0)).current;

    const [data, setData] = useState<SubstanceIngestionData>({
        substance: '',
        route: '',
        dose: 0,
        units: '',
        timestamp: new Date(),
        experienceId: null,
        notes: '',
        user: 'you'
    });

    const [substanceSearchQuery, setSubstanceSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SubstanceSearchResult[]>([]);
    const [showSubstanceSearch, setShowSubstanceSearch] = useState(false);
    const [availableRoutes, setAvailableRoutes] = useState<RouteOption[]>([]);
    const [dosageRanges, setDosageRanges] = useState<DosageRanges | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [experiences, setExperiences] = useState<ExperienceOption[]>([]);
    const [notes, setNotes] = useState('');

    // Add these new state variables for experience search
    const [experienceSearchQuery, setExperienceSearchQuery] = useState('');
    const [experienceSearchResults, setExperienceSearchResults] = useState<ExperienceOption[]>([]);
    const experienceSlideAnimation = useRef(new Animated.Value(0)).current;

// Add experience search handlers
    const slideToExperienceSearch = () => {
        Animated.spring(experienceSlideAnimation, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const slideBackFromExperienceSearch = () => {
        Animated.spring(experienceSlideAnimation, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    const handleExperienceSearch = (query: string) => {
        setExperienceSearchQuery(query);

        if (!query.trim()) {
            // Show all experiences sorted by oldest first, with "Create New Experience" at top
            const sortedExperiences = [...experiences].sort((a, b) => {
                if (a.id === null) return -1; // Keep "Create New Experience" at top
                if (b.id === null) return 1;
                return a.timestamp - b.timestamp; // Oldest first
            });
            setExperienceSearchResults(sortedExperiences);
            return;
        }

        const searchQuery = query.toLowerCase().trim();
        const filtered = experiences.filter((exp) => {
            if (exp.id === null) return true; // Always show "Create New Experience" option

            // Search by title
            if (exp.title.toLowerCase().includes(searchQuery)) return true;

            // Search by date (format the date and check if it contains the search term)
            const dateStr = new Date(exp.timestamp).toLocaleDateString().toLowerCase();
            if (dateStr.includes(searchQuery)) return true;

            // For substance search, we need to load the full experience data
            // This is a simplified version - you might want to enhance this
            return false;
        });

        // Sort filtered results with "Create New Experience" first, then oldest first
        const sortedFiltered = filtered.sort((a, b) => {
            if (a.id === null) return -1;
            if (b.id === null) return 1;
            return a.timestamp - b.timestamp;
        });

        setExperienceSearchResults(sortedFiltered);
    };

// Load experiences effect should also initialize search results
    useEffect(() => {
        const loadExperiences = async () => {
            try {
                const fileUri = `${fs.documentDirectory}experiences.json`;
                const fileInfo = await fs.getInfoAsync(fileUri);

                if (fileInfo.exists) {
                    const jsonString = await fs.readAsStringAsync(fileUri);
                    const experiencesData: Experience[] = JSON.parse(jsonString);

                    // Transform and sort experiences (oldest first)
                    const options: ExperienceOption[] = experiencesData
                        .map(exp => ({
                            id: exp.title,
                            title: exp.title,
                            timestamp: exp.sortDate || exp.creationDate
                        }))
                        .sort((a, b) => a.timestamp - b.timestamp); // Oldest first

                    // Add "New Experience" option at the top
                    options.unshift({
                        id: null,
                        title: "Create New Experience",
                        timestamp: Date.now()
                    });

                    setExperiences(options);
                    setExperienceSearchResults(options); // Initialize search results
                } else {
                    const newExperienceOption = [{
                        id: null,
                        title: "Create New Experience",
                        timestamp: Date.now()
                    }];
                    setExperiences(newExperienceOption);
                    setExperienceSearchResults(newExperienceOption);
                }
            } catch (error) {
                console.error('Error loading experiences:', error);
            }
        };

        if (visible) {
            loadExperiences();
        }
    }, [visible]);

    // Load existing experiences
    useEffect(() => {
        const loadExperiences = async () => {
            try {
                const fileUri = `${fs.documentDirectory}experiences.json`;
                const fileInfo = await fs.getInfoAsync(fileUri);

                if (fileInfo.exists) {
                    const jsonString = await fs.readAsStringAsync(fileUri);
                    const experiencesData: Experience[] = JSON.parse(jsonString);

                    // Transform and sort experiences
                    const options: ExperienceOption[] = experiencesData.map(exp => ({
                        id: exp.title, // Using title as ID for now
                        title: exp.title,
                        timestamp: exp.sortDate
                    }));

                    // Add "New Experience" option at the top
                    options.unshift({
                        id: null,
                        title: "Create New Experience",
                        timestamp: Date.now()
                    });

                    setExperiences(options);
                }
            } catch (error) {
                console.error('Error loading experiences:', error);
            }
        };

        if (visible) {
            loadExperiences();
        }
    }, [visible]);

    // Add these functions inside the AddSubstance component:

    // Slide animation handlers
    const slideToSearch = () => {
        Animated.spring(slideAnimation, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
        setShowSubstanceSearch(true);
    };

    const slideBack = () => {
        Animated.spring(slideAnimation, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
        setShowSubstanceSearch(false);
    };

    const handleSubstanceSearch = (query: string) => {
        setSubstanceSearchQuery(query);
        const results: SubstanceSearchResult[] = [];

        if (query.trim()) {
            Object.entries(substanceData).forEach(([key, value]: [string, any]) => {
                // Safely extract substance data
                let substanceInfo = null;
                if ('psychonautwiki' in value) {
                    substanceInfo = value.psychonautwiki;
                } else if ('tripsit' in value) {
                    substanceInfo = value.tripsit;
                }

                if (substanceInfo) {
                    const name = substanceInfo.name || key;
                    const prettyName = substanceInfo.pretty_name || name;

                    // Check for matches in name, pretty name, or aliases
                    if (
                        name.toLowerCase().includes(query.toLowerCase()) ||
                        prettyName.toLowerCase().includes(query.toLowerCase()) ||
                        (substanceInfo.aliases || []).some(alias =>
                            alias.toLowerCase().includes(query.toLowerCase())
                        )
                    ) {
                        results.push({
                            name: name,
                            pretty_name: prettyName,
                            color: '#4CAF50' // Default color
                        });
                    }
                }
            });
        }

        setSearchResults(results);
    };

    // Route selection renderer
    const renderRouteSelection = () => {
        if (!data.substance) return null;

        const routes = getAvailableRoutes(data.substance);

        return (
            <View style={[styles.sectionContainer, {opacity: data.substance ? 1 : 0.5}]}>
                <Text style={[styles.sectionTitle, {color: Colors[colorScheme ?? 'light'].text}]}>
                    Route of Administration
                </Text>
                <View style={styles.routesGrid}>
                    {routes.map((route) => (
                        <TouchableOpacity
                            key={route.name}
                            style={[
                                styles.routeButton,
                                {borderColor: Colors[colorScheme ?? 'light'].tint},
                                data.route === route.name && {backgroundColor: Colors[colorScheme ?? 'light'].tint},
                                !route.available && styles.routeButtonDisabled
                            ]}
                            onPress={() => {
                                if (route.available) {
                                    setData(prev => ({
                                        ...prev,
                                        route: route.name,
                                        units: route.units
                                    }));
                                    if (step < 3) setStep(3);
                                }
                            }}
                            disabled={!route.available}
                        >
                            <Text style={[
                                styles.routeButtonText,
                                {color: Colors[colorScheme ?? 'light'].text},
                                data.route === route.name && {color: Colors[colorScheme ?? 'light'].background}
                            ]}>
                                {route.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    // Dosage input renderer
    const renderDosageInput = () => {
        if (!data.route) return null;

        const substance = substanceData[data.substance.toLowerCase()];
        const dosageData = substance?.psychonautwiki?.dosage?.routes?.[data.route] ||
            substance?.tripsit?.dosage?.routes?.[data.route];

        return (
            <View style={[styles.sectionContainer, {opacity: data.route ? 1 : 0.5}]}>
                <Text style={[styles.sectionTitle, {color: Colors[colorScheme ?? 'light'].text}]}>
                    Dosage
                </Text>
                <View style={styles.dosageInputContainer}>
                    <TextInput
                        style={[
                            styles.dosageInput,
                            {
                                color: Colors[colorScheme ?? 'light'].text,
                                borderColor: Colors[colorScheme ?? 'light'].border
                            }
                        ]}
                        placeholder="Enter dose"
                        placeholderTextColor={Colors[colorScheme ?? 'light'].metaText
                        }
                        keyboardType="decimal-pad"
                        value={data.dose ? data.dose.toString() : ''}
                        onChangeText={(text) => {
                            const dose = parseFloat(text);
                            if (!isNaN(dose)) {
                                setData(prev => ({...prev, dose}));
                                if (step < 4) setStep(4);
                            } else if (text.length === 0) {
                                setData(prev => ({...prev, dose: 0}));
                                if (step == 4) setStep(3);
                            }
                        }}
                    />
                    <Text style={[styles.unitsText, {color: Colors[colorScheme ?? 'light'].text}]}>
                        {data.units || 'units'}
                    </Text>
                </View>
                {dosageData && (
                    <View style={styles.rangesContainer}>
                        {dosageData.threshold && (
                            <View style={styles.doseRange}>
                                <Text style={[styles.rangeNumber, {color: '#4169E1'}]}>
                                    {dosageData.threshold}
                                </Text>
                                <Text style={[styles.rangeLabel, {color: Colors[colorScheme ?? 'light'].text}]}>
                                    Threshold
                                </Text>
                            </View>
                        )}
                        {dosageData.light && (
                            <View style={styles.doseRange}>
                                <Text style={[styles.rangeNumber, {color: '#32CD32'}]}>
                                    {dosageData.light.min} - {dosageData.light.max}
                                </Text>
                                <Text style={[styles.rangeLabel, {color: Colors[colorScheme ?? 'light'].text}]}>
                                    Light
                                </Text>
                            </View>
                        )}
                        {dosageData.common && (
                            <View style={styles.doseRange}>
                                <Text style={[styles.rangeNumber, {color: '#FFD700'}]}>
                                    {dosageData.common.min} - {dosageData.common.max}
                                </Text>
                                <Text style={[styles.rangeLabel, {color: Colors[colorScheme ?? 'light'].text}]}>
                                    Common
                                </Text>
                            </View>
                        )}
                        {dosageData.strong && (
                            <View style={styles.doseRange}>
                                <Text style={[styles.rangeNumber, {color: '#FFA500'}]}>
                                    {dosageData.strong.min} - {dosageData.strong.max}
                                </Text>
                                <Text style={[styles.rangeLabel, {color: Colors[colorScheme ?? 'light'].text}]}>
                                    Strong
                                </Text>
                            </View>
                        )}
                        {dosageData.heavy && (
                            <View style={styles.doseRange}>
                                <Text style={[styles.rangeNumber, {color: '#FF0000'}]}>
                                    {dosageData.heavy}+
                                </Text>
                                <Text style={[styles.rangeLabel, {color: Colors[colorScheme ?? 'light'].text}]}>
                                    Heavy
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    // ... previous useEffects and functions remain the same

    const renderDateTimeSelection = () => {
        if (!data.dose) return null;

        const formatDate = (date: Date) => {
            return date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        const formatTime = (date: Date) => {
            return date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        return (
            <View style={[styles.sectionContainer, {opacity: data.dose > 0 ? 1 : 0.5}]}>
                <Text style={[styles.sectionTitle, {color: Colors[colorScheme ?? 'light'].text}]}>
                    Date and Time
                </Text>
                <View style={styles.dateTimeContainer}>
                    <TouchableOpacity
                        style={[styles.dateTimeButton, {borderColor: Colors[colorScheme ?? 'light'].tint}]}
                    >
                        <IconSymbol name="calendar" size={20} color={Colors[colorScheme ?? 'light'].text}/>
                        <DateTimePicker
                            value={data.timestamp}
                            mode={"date"}
                            is24Hour={true}
                            onChange={(event, selectedDate) => {
                                if (event.type === 'dismissed') {
                                    return;
                                }

                                if (selectedDate) {
                                    setData(prev => ({...prev, timestamp: selectedDate}));
                                    if (step < 5) setStep(5);
                                }
                            }}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dateTimeButton, {borderColor: Colors[colorScheme ?? 'light'].tint}]}>
                        <IconSymbol name="clock" size={20} color={Colors[colorScheme ?? 'light'].text}/>
                        <DateTimePicker
                            value={data.timestamp}
                            mode={"time"}
                            is24Hour={false}
                            onChange={(event, selectedDate) => {
                                if (event.type === 'dismissed') {
                                    return;
                                }

                                if (selectedDate) {
                                    setData(prev => ({...prev, timestamp: selectedDate}));
                                    if (step < 5) setStep(5);
                                }
                            }}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Update the renderExperienceSelection function
    const renderExperienceSelection = () => {
        if (!data.timestamp) return null;

        return (
            <View style={[styles.sectionContainer, {opacity: data.timestamp ? 1 : 0.5}]}>
                <Text style={[styles.sectionTitle, {color: Colors[colorScheme ?? 'light'].text}]}>
                    Experience
                </Text>
                <TouchableOpacity
                    style={[styles.experienceSelector, {borderColor: Colors[colorScheme ?? 'light'].tint}]}
                    onPress={slideToExperienceSearch}
                >
                    <Text style={[styles.experienceSelectorText, {color: Colors[colorScheme ?? 'light'].text}]}>
                        {data.experienceId ?
                            experiences.find(e => e.id === data.experienceId)?.title :
                            'Create New Experience'}
                    </Text>
                    <IconSymbol name="chevron.right" size={24} color={Colors[colorScheme ?? 'light'].text}/>
                </TouchableOpacity>
                {!data.experienceId && (
                    <TextInput
                        style={[styles.experienceNameInput, {
                            color: Colors[colorScheme ?? 'light'].text,
                            borderColor: Colors[colorScheme ?? 'light'].border
                        }]}
                        placeholder="Enter experience name"
                        placeholderTextColor={Colors[colorScheme ?? 'light'].metaText}
                        value={newExperienceName}
                        onChangeText={setNewExperienceName}
                    />
                )}
            </View>
        );
    };

    function cleanUpDataOnClose() {
        setData({
            substance: '',
            route: '',
            dose: 0,
            units: '',
            timestamp: new Date(),
            experienceId: null,
            notes: '',
            user: 'you'
        });
        setStep(1);
        setNotes('');
        setSubstanceSearchQuery('');
        setSearchResults([]);
        setShowSubstanceSearch(false);
        setExperienceSearchQuery('');
        slideAnimation.setValue(0);
        experienceSlideAnimation.setValue(0);
        setNewExperienceName('')
    }

// Update the main content to include experience selection and notes
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay} activeOpacity={1}>
                <View style={[styles.modalContent, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                    <ScrollView>
                        <Animated.View style={[styles.mainContent, {
                            transform: [{
                                translateX: slideAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -Dimensions.get('window').width]
                                })
                            }]
                        }]}>
                            {/* Substance selector */}
                            <View style={[styles.sectionContainer, {opacity: data.timestamp ? 1 : 0.5}]}>
                                <Text style={[styles.sectionTitle, {color: Colors[colorScheme ?? 'light'].text}]}>
                                    Substance
                                </Text>
                                <TouchableOpacity
                                    style={[styles.experienceSelector, {borderColor: Colors[colorScheme ?? 'light'].tint}]}
                                    onPress={slideToSearch}
                                >
                                    <Text style={[styles.selectorText, {color: Colors[colorScheme ?? 'light'].text}]}>
                                        {data.substance || 'Select Substance'}
                                    </Text>
                                    <IconSymbol name="chevron.right" size={24}
                                                color={Colors[colorScheme ?? 'light'].text}/>
                                </TouchableOpacity>
                            </View>
                            {/* Route selection */}
                            {renderRouteSelection()}
                            {renderDosageInput()}
                            {renderDateTimeSelection()}
                            {renderExperienceSelection()}
                            <View style={styles.routesGrid}>
                                <TouchableOpacity style={[
                                    styles.routeButton,
                                    {borderColor: Colors[colorScheme ?? 'light'].tint},
                                    {backgroundColor: Colors[colorScheme ?? 'light'].card},
                                    step < 4 ? styles.routeButtonDisabled : {}
                                ]} onPress={() => {
                                    if (step >= 4) {
                                        handleSubmit(data).then(async () => {
                                            cleanUpDataOnClose()
                                            Promise.resolve()
                                        }).then(onClose);
                                    }
                                }} disabled={step < 4}>
                                    <Text
                                        style={[styles.routeButtonText, {color: Colors[colorScheme ?? 'light'].text}]}>
                                        Submit
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[
                                    styles.routeButton,
                                    {borderColor: Colors[colorScheme ?? 'light'].tint},
                                    {backgroundColor: Colors[colorScheme ?? 'light'].card}
                                ]} onPress={() => {
                                    cleanUpDataOnClose();
                                    onClose();
                                }}>
                                    <Text
                                        style={[styles.routeButtonText, {color: Colors[colorScheme ?? 'light'].text}]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </ScrollView>
                    {/* Substance search screen */}
                    <Animated.View style={[
                        styles.searchScreen,
                        {
                            transform: [{
                                translateX: slideAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [Dimensions.get('window').width, 0]
                                })
                            }],
                            backgroundColor: Colors[colorScheme ?? 'light'].background
                        }
                    ]}>
                        <View style={styles.searchHeader}>
                            <TouchableOpacity onPress={slideBack}>
                                <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text}/>
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.searchInput, {color: Colors[colorScheme ?? 'light'].text}]}
                                placeholder="Search substances..."
                                placeholderTextColor={Colors[colorScheme ?? 'light'].metaText}
                                value={substanceSearchQuery}
                                onChangeText={handleSubstanceSearch}
                                autoFocus={showSubstanceSearch}
                            />
                        </View>
                        <FlatList
                            data={searchResults}
                            keyExtractor={item => item.name}
                            renderItem={({item}) => (
                                <TouchableOpacity
                                    style={styles.searchResultItem}
                                    onPress={() => {
                                        setData(prev => ({...prev, substance: item.name}));
                                        slideBack();
                                    }}
                                >
                                    <View style={[styles.colorDot, {backgroundColor: item.color}]}/>
                                    <Text style={[styles.resultText, {color: Colors[colorScheme ?? 'light'].text}]}>
                                        {item.pretty_name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </Animated.View>
                    {/* Experience search overlay */}
                    <Animated.View style={[
                        styles.searchScreen,
                        {
                            transform: [{
                                translateX: experienceSlideAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [Dimensions.get('window').width, 0]
                                })
                            }],
                            backgroundColor: Colors[colorScheme ?? 'light'].background
                        }
                    ]}>
                        <View style={styles.searchHeader}>
                            <TouchableOpacity onPress={slideBackFromExperienceSearch}>
                                <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text}/>
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.searchInput, {color: Colors[colorScheme ?? 'light'].text}]}
                                placeholder="Search Experiences..."
                                placeholderTextColor={Colors[colorScheme ?? 'light'].metaText}
                                value={experienceSearchQuery}
                                onChangeText={handleExperienceSearch}
                            />
                        </View>
                        <FlatList
                            data={experienceSearchResults}
                            keyExtractor={item => `${item.id || 'new'}-${Math.random()}`}
                            renderItem={({item}) => (
                                <TouchableOpacity
                                    style={styles.searchResultItem}
                                    onPress={() => {
                                        setData(prev => ({...prev, experienceId: item.id}));
                                        slideBackFromExperienceSearch();
                                    }}
                                >
                                    <View style={{flex: 0}}>
                                        <Text style={[styles.resultText, {
                                            color: !item.id ? Colors[colorScheme ?? 'light'].caution : Colors[colorScheme ?? 'light'].text
                                        }]}>
                                            {item.title}
                                        </Text>
                                        {item.id !== null && (
                                            <Text style={[styles.dateTimeText, {
                                                color: Colors[colorScheme ?? 'light'].metaText,
                                                fontSize: 12,
                                                marginTop: 2,
                                                marginLeft: 0
                                            }]}>
                                                {new Date(item.timestamp).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </Animated.View>
                </View>
            </View>
        </Modal>
    )
}
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: "88%",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    mainContent: {
        flex: 1,
        width: '100%',
    },
    searchScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.light.background,
    },
    substanceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        marginBottom: 16,
    },
    selectorText: {
        fontSize: 16,
        fontWeight: '500',
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchInput: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        padding: 8,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    resultText: {
        fontSize: 16,
    },
    sectionContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    routesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    routeButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        margin: 6,
        minWidth: '45%',
        alignItems: 'center',
    },
    routeButtonDisabled: {
        opacity: 0.5,
    },
    routeButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    // ... previous styles remain the same

    dosageInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dosageInput: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginRight: 12,
        fontSize: 16,
    },
    unitsText: {
        fontSize: 16,
        fontWeight: '500',
        width: 60,
    },
    rangesContainer: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    rangeText: {
        fontSize: 14,
        marginVertical: 4,
    },

    dateTimeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        flex: 0.48,
    },
    dateTimeText: {
        fontSize: 14,
        marginLeft: 8,
    },

    experienceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
    },
    experienceSelectorText: {
        fontSize: 16,
    },
    notesContainer: {
        marginTop: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        marginBottom: 8,
    },
    notesInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        height: 100,
        fontSize: 16,
    },
    experienceSearchOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    experienceSearchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    experienceSearchTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 16,
    },
    experienceList: {
        flex: 1,
    },
    experienceItem: {
        padding: 16,
        borderBottomWidth: 1,
    },
    experienceItemTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    experienceItemDate: {
        fontSize: 14,
    },
    experienceNameInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        fontSize: 16,
    },
    doseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        alignContent: "space-between"
    },
    doseRange: {
        flexDirection: 'column',
        alignItems: 'center',
        marginHorizontal: 4,
        marginVertical: 4,
    },
    rangeNumber: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    rangeDash: {
        width: 20,
        height: 1,
        backgroundColor: '#ccc',
        marginBottom: 4,
    },
    rangeLabel: {
        fontSize: 12,
        fontWeight: '500',
    },

});