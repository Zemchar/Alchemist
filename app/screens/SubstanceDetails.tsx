import React from 'react';
import {
    Dimensions,
    FlatList,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {IconSymbol} from "@/components/ui/IconSymbol";
import {useNavigation, useRoute} from "@react-navigation/native";
import {Card} from "@rneui/themed";
import {AreaChart} from "@/components/AreaChart";

const cardWidth = Dimensions.get('window').width - 20


const SubstanceDetails = () => {
    const route = useRoute();
    // @ts-ignore - Access the substance from route.params
    const {substance} = route.params;
    const navigation = useNavigation();
    const colorScheme = useColorScheme();

    if (!substance) {
        return (
            <SafeAreaView style={[styles.container, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                <View style={[styles.header, {borderColor: Colors[colorScheme ?? 'light'].border}]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <IconSymbol name="chevron.left" size={28} color={Colors[colorScheme ?? 'light'].text}/>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {color: Colors[colorScheme ?? 'light'].text}]}>How did we get
                        here?</Text>
                </View>
                <ScrollView style={styles.scrollView}>
                    <Text>Hmmm... No substance data was found</Text>
                    {/* Bottom spacer */}
                    <View style={{height: 80}}/>
                </ScrollView>
            </SafeAreaView>
        );
    } else {
        // @ts-ignore
        // @ts-ignore
        return (
            <SafeAreaView style={[styles.container, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                {/* Header */}
                <View style={[styles.header, {borderColor: Colors[colorScheme ?? 'light'].border}]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <IconSymbol name="chevron.left" size={28} color={Colors[colorScheme ?? 'light'].text}/>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {color: Colors[colorScheme ?? 'light'].text}]}>
                        {substance.pretty_name || substance.name}
                    </Text>
                </View>

                {/* Substance Information
                I am aware using scrollview is not recommended when nested in a safe area/another scrollview, but it works fine for now.
                TODO: Revisit this and remove nested scrollview if causing issues*/}
                <ScrollView style={styles.scrollView} horizontal={true} nestedScrollEnabled={true} pagingEnabled={true}>
                    <View>

                    <Card containerStyle={[styles.card, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                        <Text
                            style={[styles.cardTitle, {color: Colors[colorScheme ?? 'light'].text}]}>Information</Text>
                        <Text
                            style={[styles.cardText, {color: Colors[colorScheme ?? 'light'].text}]}>{substance.properties?.summary}</Text>
                    </Card>

                        {/*Dose card*/}
                        <Card
                            containerStyle={[styles.card, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                            <Text style={[styles.cardTitle, {color: Colors[colorScheme ?? 'light'].text}]}>Dosage &
                                Timing</Text>
                            <AreaChart
                                data={[
                                    [
                                        {value: 1, label: '0h'},
                                        {value: 2, label: '1h'},
                                        {value: 3, label: '2h'},
                                        {value: 4, label: '3h'},
                                        {value: 2, label: '4h'},
                                        {value: 1, label: '5h'}
                                    ]
                                ]}
                                lineColor={["#a8ffae"]}
                                hideDots={true}

                                height={200}
                            />

                            {substance.dosage?.routes && Object.entries(substance.dosage.routes).map(([route, info]) => (
                                <View key={route}>
                                    <Text style={[styles.cardText, {color: Colors[colorScheme ?? 'light'].text}]}>
                                        {route.toUpperCase()}:
                                        //@ts-ignore
                                        {info.common && ` Common: ${info.common.min}-${info.common.max} ${info.units}`}
                                    </Text>
                                </View>
                            ))}

                        </Card>
                    </View>


                    {/*Interactions*/}
                    <Card containerStyle={[styles.card, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                        <FlatList
                            data={[
                                {
                                    title: "Dangerous",
                                    items: substance.interactions?.dangerous || [],
                                    color: Colors[colorScheme ?? 'light'].error,
                                    warningSigns: 3
                                },
                                {
                                    title: "Unsafe",
                                    items: substance.interactions?.unsafe || [],
                                    color: Colors[colorScheme ?? 'light'].warning,
                                    warningSigns: 2
                                },
                                {
                                    title: "Caution",
                                    items: substance.interactions?.caution || [],
                                    color: Colors[colorScheme ?? 'light'].caution,
                                    warningSigns: 1
                                }
                            ]}
                            renderItem={({item}) => (
                                <>

                                    {item.items.map((interaction, index) => (
                                        <TouchableOpacity key={index} style={[{
                                            borderTopWidth: 1,
                                            borderBottomWidth: 1,
                                            borderColor: Colors[colorScheme ?? 'light'].border,
                                            paddingVertical: 8
                                        }]}>
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: "space-between",
                                                alignItems: 'center'
                                            }}>
                                                <Text style={[styles.cardText, {color: item.color}]}>
                                                    {interaction}
                                                </Text>
                                                <Text style={[styles.cardText, {color: item.color}]}>
                                                    {"⚠".repeat(item.warningSigns)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                            ListHeaderComponent={
                                <Text
                                    style={[styles.cardTitle, {color: Colors[colorScheme ?? 'light'].text}]}>Interactions</Text>
                            }
                        />
                        {substance.properties?.avoid != "" &&
                            <View style={{paddingVertical: 10}}>
                                <Text style={[styles.cardText, {
                                    color: Colors[colorScheme ?? 'light'].text,
                                    fontSize: 20
                                }]}>Especially Avoid</Text>
                                <Text style={[styles.cardText, {color: 'red'}]}>{substance.properties.avoid}</Text>
                            </View>
                        }
                        {substance.interactions?.dangerous?.length <= 0 && substance.interactions?.unsafe?.length <= 0 && substance.interactions?.caution?.length <= 0 && (
                            <View style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 20,
                                height: 100
                            }}>.
                                <Text
                                    style={[styles.cardText, {
                                        color: Colors[colorScheme ?? 'light'].text,
                                        textAlign: 'center'
                                    }]}>
                                    No interactions found.
                                </Text>
                                <Text style={{color: Colors[colorScheme ?? 'light'].text, textAlign: 'center'}}>
                                    This doesn't mean that none exist. Proceed with caution.
                                </Text>
                            </View>
                        )}
                    </Card>
                    <View>
                        {substance.effects_detailed.length <= 0 || substance.effects.length <= 0 &&
                    <Card containerStyle={[styles.card, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                        <Text style={[styles.cardTitle, {color: Colors[colorScheme ?? 'light'].text}]}>Possible
                            Effects</Text>
                        <Text style={[styles.cardText, {color: Colors[colorScheme ?? 'light'].text}]}>Effects can vary
                            wildly from person to person and tend to be highly dose-dependent.
                        </Text>
                        <Text style={[styles.cardText, {color: Colors[colorScheme ?? 'light'].text}]}>Just because an
                            effect is listed here or someone you know experiences certain effects does not guarantee
                            they happen </Text>
                        <View style={styles.effectsContainer}>
                            <FlatList
                                data={(substance.effects_detailed.length > 0 ? substance.effects_detailed : substance.effects)}
                                style={{height: 380, backgroundColor: Colors[colorScheme ?? 'light'].background}}
                                keyExtractor={(_, index) => index.toString()}
                                renderItem={({item: effect}) => (
                                    <TouchableOpacity
                                        onPress={() => effect.url ? Linking.openURL(effect.url) : null}
                                        style={[{
                                            borderTopWidth: 1,
                                            borderBottomWidth: 1,
                                            borderColor: Colors[colorScheme ?? 'light'].border,
                                            paddingVertical: 8
                                        }]}>
                                        <Text style={[styles.cardText, {color: Colors[colorScheme ?? 'light'].text}]}>
                                            {(effect.name) ? effect.name : effect}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                        {substance.effects_detailed.length <= 0 && substance.effects.length <= 0 && (
                            <View style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 20,
                                height: 100
                            }}>
                                <Text
                                    style={[styles.cardText, {
                                        color: Colors[colorScheme ?? 'light'].text,
                                        textAlign: 'center'
                                    }]}>
                                    No known effects.
                                </Text>
                            </View>
                        )}
                    </Card>
                        }
                        {substance.properties?.note?.toLowerCase().startsWith("addiction potential") &&
                            <Card
                                containerStyle={[styles.card, {backgroundColor: Colors[colorScheme ?? 'light'].background}]}>
                                <Text style={[styles.cardTitle, {color: Colors[colorScheme ?? 'light'].text}]}>Addiction
                                    Potential</Text>
                                <Text
                                    style={[styles.cardText, {color: Colors[colorScheme ?? 'light'].text}]}>{substance.properties.note.split("Addiction potential: ")[1]}</Text>
                            </Card>
                        }
                    </View>

                    {/* Bottom spacer */}
                    <View style={{height: 80}}/>
                </ScrollView>
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: -0.5,
        flex: 1,
    },
    section: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    card: {
        margin: 10,
        borderRadius: 10,
        padding: 15,
        width: cardWidth,
    },
    cardTitle: {
        fontSize: 25,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    cardText: {
        fontSize: 16,
        marginBottom: 5,
    },
    effectsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: 8,
    },
    effectTag: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
    },
    effectText: {
        fontSize: 14,
    },
})

export default SubstanceDetails;