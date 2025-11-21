import {Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {IconSymbol} from '@/components/ui/IconSymbol';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {BlurView} from 'expo-blur';

export default function SaferScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const sectionBgColor = colorScheme === 'dark' ? 'rgba(28,28,30,0.8)' : 'rgba(255,255,255,0.8)';
  const sectionHeaderColor = colorScheme === 'dark' ? '#666' : '#8e8e93';

  const renderSection = (title: string, content: string, links?: Array<{title: string, onPress?: () => void}>) => (
    <>
      <Text style={[styles.sectionHeader, { color: sectionHeaderColor }]}>{title}</Text>
      <BlurView intensity={20} style={[styles.section, { backgroundColor: sectionBgColor }]}>
        <Text style={[styles.sectionText, { color: textColor }]}>{content}</Text>
        {links && links.map((link, index) => (
          <Pressable 
            key={index}
            style={styles.link}
            onPress={link.onPress}
          >
            <Text style={[styles.linkText, { color: tintColor }]}>{link.title}</Text>
            <IconSymbol name="chevron.right" size={20} color={sectionHeaderColor} />
          </Pressable>
        ))}
      </BlurView>
    </>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#000' : '#f2f2f7' }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>Safer Use</Text>

        {renderSection('RESEARCH', 
          'In advance research the duration, subjective effects and potential adverse effects which the substance or combination of substances are likely to produce.\n\nRead the info in here and also the PsychonautWiki article. Its best to cross-reference with other sources (Tripsit, Erowid, Wikipedia, Bluelight, Reddit, etc). There is no rush.'
        )}

        {renderSection('TESTING',
          'Test your substance with anonymous and free drug testing services. If those are not available in your country, use reagent testing kits. Don\'t trust your dealer to sell reliable product. Its better to have a tested stash instead of relying on a source spontaneously.',
          [
            { title: 'Drug Testing Services' },
            { title: 'Reagent Testing' }
          ]
        )}

        {renderSection('DOSAGE',
          'Know your dose, start small and wait. A full stomach can delay the onset of a swallowed ingestion by hours. A dose that\'s light for somebody with a tolerance might be too much for you.\n\nInvest in a milligram scale so you can accurately weigh your dosages. Bear in mind that milligram scales under $1000 cannot accurately weigh out doses below 50 mg and are highly inaccurate under 10-15 mg. If the amounts of the drug are smaller, use volumetric dosing (dissolving in water or alcohol to make it easier to measure).\n\nMany substances do not have linear dose-response curves, meaning that doubling the dose amount will cause a greater than double increase (and rapidly result in overwhelming, unpleasant, and potentially dangerous experiences), therefore doses should only be adjusted upward with slight increases (e.g. 1/4 to 1/2 of the previous dose).',
          [
            { title: 'Dosage Guide' },
            { title: 'Dosage Classification' },
            { title: 'Volumetric Liquid Dosing' }
          ]
        )}

        {renderSection('SET',
          'Make sure your thoughts, desires, feelings, general mood, and any preconceived notions or expectations about what you are about to experience are conducive to the experience. Make sure your body is well. Better not to take it if you feel sick, injured or generally unhealthy.'
        )}

        {renderSection('SETTING',
          'An unfamiliar, uncontrollable or otherwise disagreeable social or physical environment may result in an unpleasant or dangerous experience. Choose an environment that provides a sense of safety, familiarity, control, and comfort. For using hallucinogens (psychedelics, dissociatives and deliriants) refer to the safer hallucinogen guide.',
          [
            { title: 'Safer Hallucinogen Guide' }
          ]
        )}

        {renderSection('COMBINATIONS',
          'Don\'t combine drugs, including Alcohol, without research on the combo. The most common cause of substance-related deaths is the combination of depressants (such as opiates, benzodiazepines, or alcohol) with other depressants.',
          [
            { title: 'Swiss Combination Checker', onPress: () => Linking.openURL('https://combo.tripsit.me/') },
            { title: 'Tripsit Combination Checker', onPress: () => Linking.openURL('https://wiki.tripsit.me/wiki/Drug_combinations') }
          ]
        )}

        {renderSection('ADMINISTRATION ROUTES',
          'Don\'t share snorting equipment (straws, banknotes, bullets) to avoid blood-borne diseases such as Hepatitis C that can be transmitted through blood amounts so small you can\'t notice. Injection is the the most dangerous route of administration and highly advised against. If you are determined to inject, don\'t share injection materials and refer to the safer injection guide.',
          [
            { title: 'Administration Routes Info' }
          ]
        )}

        {renderSection('ALLERGY TESTS',
          'Simply dose a minuscule amount of the substance (e.g. 1/10 to 1/4 of a regular dose) and wait several hours to verify that you do not exhibit an unusual or idiosyncratic response.'
        )}

        {renderSection('REFLECTION',
          'Carefully monitor the frequency and intensity of any substance use to ensure it is not sliding into abuse and addiction. In particular, many stimulants, opioids, and depressants are known to be highly addictive.'
        )}

        {renderSection('SAFETY OF OTHERS',
          'Don\'t drive, operate heavy machinery, or otherwise be directly or indirectly responsible for the safety or care of another person while intoxicated.'
        )}

        {renderSection('RECOVERY POSITION',
          'If someone is unconscious and breathing place them into Recovery Position to prevent death by the suffocation of vomit after a drug overdose.\nHave the contact details of help services to hand in case of urgent need.',
          [
            { title: 'Recovery Position Video' }
          ]
        )}

        <BlurView intensity={20} style={[styles.section, { backgroundColor: sectionBgColor }]}>
          <Pressable style={styles.link}>
            <IconSymbol name="humidifier.and.droplets.fill" size={24} color={tintColor} style={styles.icon} />
            <Text style={[styles.linkText, { color: textColor }]}>Spray Calculator</Text>
            <IconSymbol name="chevron.right" size={20} color={sectionHeaderColor} />
          </Pressable>
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
  },
  sectionText: {
    fontSize: 17,
    lineHeight: 24,
    padding: 16,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2c2c2e',
  },
  linkText: {
    fontSize: 17,
    flex: 1,
  },
  icon: {
    marginRight: 12,
    width: 24,
  },
}); 