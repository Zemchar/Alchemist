import React from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View} from 'react-native';
import {IconSymbol} from '@/components/ui/IconSymbol';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import Constants from 'expo-constants';
import {BlurView} from 'expo-blur';
import * as fs from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

// Define the file URI as requested
const fileUri = fs.documentDirectory + 'experiences.json';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const sectionBgColor =
      colorScheme === 'dark' ? 'rgba(28,28,30,0.8)' : 'rgba(255,255,255,0.8)';
  const sectionHeaderColor = colorScheme === 'dark' ? '#666' : '#8e8e93';
  const separatorColor =
      colorScheme === 'dark' ? 'rgba(44,44,46,0.5)' : 'rgba(229,229,234,0.5)';

  // Get version from app.json via Expo Constants
  const version = Constants.expoConfig?.version || '0.0.0';

  // --- Data Management Functions ---

  /**
   * Exports the experiences.json file using the native share sheet.
   */
  const handleExport = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        return;
      }

      const fileInfo = await fs.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('No Data', 'There is no experience data to export.');
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export your experiences',
        UTI: 'public.json',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Could not export data.');
    }
  };

  /**
   * Imports a .json file from the user's device and overwrites
   * the existing experiences.json file.
   */
  const handleImport = async () => {
    Alert.alert(
        'Confirm Import',
        'Importing a new file will overwrite all current experiences. This action cannot be undone.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Import',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: 'application/json',
                  copyToCacheDirectory: false, // Use direct file access
                });

                if (result.canceled) {
                  return;
                }

                const pickedFile = result.assets?.[0];

                if (!pickedFile?.uri) {
                  Alert.alert('Error', 'Could not get the selected file.');
                  return;
                }

                // Read the content of the picked file
                const jsonString = await fs.readAsStringAsync(pickedFile.uri, {
                  encoding: fs.EncodingType.UTF8,
                });

                // --- Start Validation ---
                let parsedData;
                try {
                  parsedData = JSON.parse(jsonString);
                } catch (e) {
                  Alert.alert('Import Failed', 'The file is not valid JSON.');
                  return;
                }

                // Check if it's an array (which experiences.json should be)
                if (!Array.isArray(parsedData)) {
                  Alert.alert(
                      'Import Failed',
                      'Invalid file format. The file is not a valid experience backup.'
                  );
                  return;
                }

                // (Optional but recommended) Check for key properties on the first item
                if (parsedData.length > 0) {
                  const firstExperience = parsedData[0];
                  if (
                      typeof firstExperience.creationDate === 'undefined' ||
                      typeof firstExperience.ingestions === 'undefined'
                  ) {
                    Alert.alert(
                        'Import Failed',
                        'Invalid data. The file does not appear to be an experience backup.'
                    );
                    return;
                  }
                }
                // --- End Validation ---

                // Validation passed, write the file
                await fs.writeAsStringAsync(fileUri, jsonString, {
                  encoding: fs.EncodingType.UTF8,
                });

                Alert.alert(
                    'Import Successful',
                    'Your data has been imported. Please restart the app to see the changes.'
                );
              } catch (error) {
                console.error('Error importing data:', error);
                Alert.alert(
                    'Error',
                    'Could not import data. Please make sure it is a valid .json file.'
                );
              }
            },
          },
        ]
    );
  };

  /**
   * Deletes the experiences.json file after double confirmation.
   */
  const handleDelete = async () => {
    Alert.alert(
        'Delete All Data?',
        'Are you sure you want to delete all journal data? This action cannot be undone.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                  'Final Confirmation',
                  'Are you absolutely sure? All experience data will be permanently erased.',
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Delete Everything',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await fs.deleteAsync(fileUri, {idempotent: true});
                          Alert.alert(
                              'Data Deleted',
                              'All experience data has been deleted. Please restart the app.'
                          );
                        } catch (error) {
                          console.error('Error deleting data:', error);
                          Alert.alert('Error', 'Could not delete data.');
                        }
                      },
                    },
                  ]
              );
            },
          },
        ]
    );
  };

  const renderSettingRow = (
      text: string,
      icon?: string,
      rightElement?: React.ReactNode,
      onPress?: () => void
  ) => (
      <Pressable
          style={({pressed}) => [
            styles.settingRow,
            {borderBottomColor: separatorColor},
            pressed && {
              opacity: 0.7,
              backgroundColor:
                  colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
            },
          ]}
          onPress={onPress}
      >
        <View style={styles.settingWithIcon}>
          {icon && (
              <IconSymbol
                  name={icon}
                  size={24}
                  color={tintColor}
                  style={styles.settingIcon}
              />
          )}
          <Text
              style={[
                styles.settingText,
                {color: textColor},
                !icon && {marginLeft: 36}, // Align text when no icon
              ]}
          >
            {text}
          </Text>
        </View>
        {rightElement}
      </Pressable>
  );

  return (
      <ScrollView
          style={[
            styles.container,
            {backgroundColor: colorScheme === 'dark' ? '#000' : '#f2f2f7'},
          ]}
          contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          <Text style={[styles.title, {color: textColor}]}>Settings</Text>

          <Text style={[styles.sectionHeader, {color: sectionHeaderColor}]}>
            PRIVACY
          </Text>
          <BlurView
              intensity={20}
              style={[styles.section, {backgroundColor: sectionBgColor}]}
          >
            {renderSettingRow(
                'Require App Unlock',
                'lock',
                <Switch
                    value={true}
                    onValueChange={() => {
                    }} // Add logic for this
                    ios_backgroundColor={
                      colorScheme === 'dark' ? '#3a3a3c' : '#e5e5ea'
                    }
                />
            )}
            {renderSettingRow(
                'After 5 minutes',
                'clock',
                <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={sectionHeaderColor}
                />
            )}
          </BlurView>

          <Text style={[styles.sectionHeader, {color: sectionHeaderColor}]}>
            UI
          </Text>
          <BlurView
              intensity={20}
              style={[styles.section, {backgroundColor: sectionBgColor}]}
          >
            {renderSettingRow(
                'Edit Substance Colors',
                'paintpalette',
                <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={sectionHeaderColor}
                />
            )}
            {renderSettingRow(
                'Custom Units',
                'ruler',
                <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={sectionHeaderColor}
                />
            )}
            {renderSettingRow(
                'Hide dosage dots',
                undefined,
                <Switch value={false} onValueChange={() => {
                }}/>
            )}
            {renderSettingRow(
                'Hide tolerance chart',
                undefined,
                <Switch value={false} onValueChange={() => {
                }}/>
            )}
            {renderSettingRow(
                'Hide substance info',
                undefined,
                <Switch value={false} onValueChange={() => {
                }}/>
            )}
            {renderSettingRow(
                'Draw redoses individually',
                undefined,
                <Switch value={false} onValueChange={() => {
                }}/>
            )}
            {renderSettingRow(
                'Independent substance heights',
                undefined,
                <Switch value={false} onValueChange={() => {
                }}/>
            )}
            {renderSettingRow(
                'Automatic live activities',
                undefined,
                <Switch value={true} onValueChange={() => {
                }}/>
            )}
          </BlurView>

          <Text style={[styles.sectionHeader, {color: sectionHeaderColor}]}>
            JOURNAL DATA
          </Text>
          <BlurView
              intensity={20}
              style={[styles.section, {backgroundColor: sectionBgColor}]}
          >
            {renderSettingRow('Export Data', undefined, undefined, handleExport)}
            {renderSettingRow('Import Data', undefined, undefined, handleImport)}
            {renderSettingRow(
                'Delete Everything',
                undefined,
                undefined,
                handleDelete
            )}
          </BlurView>

          <Text style={[styles.sectionHeader, {color: sectionHeaderColor}]}>
            COMMUNICATION
          </Text>
          <BlurView
              intensity={20}
              style={[styles.section, {backgroundColor: sectionBgColor}]}
          >
            {renderSettingRow(
                'Share App',
                'person.2',
                <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={sectionHeaderColor}
                />
            )}
            {renderSettingRow(
                'Question, Bug Report',
                undefined,
                undefined,
                () => {
                  // Add linking to your support email/page
                }
            )}
            {renderSettingRow(
                'Frequently Asked Questions',
                'questionmark.circle',
                <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={sectionHeaderColor}
                />
            )}
            {renderSettingRow('Source Code', undefined, undefined, () => {
              // Add linking to your GitHub
            })}
          </BlurView>

          <BlurView
              intensity={20}
              style={[
                styles.section,
                {backgroundColor: sectionBgColor, marginTop: 20},
              ]}
          >
            {renderSettingRow(`Version ${version}`, undefined, undefined)}
            <View
                style={[styles.settingRow, {borderBottomWidth: 0, paddingTop: 0}]}
            >
              <Text style={[styles.creditText, {color: sectionHeaderColor}]}>
                Built with ❤️ by SubstanceSearch contributors
              </Text>
            </View>
          </BlurView>
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase', // Added for iOS feel
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // Separator color is set dynamically
  },
  settingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
    width: 24, // Ensures text alignment
  },
  settingText: {
    fontSize: 17,
    flex: 1,
  },
  creditText: {
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
    opacity: 0.8,
  },
});