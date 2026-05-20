import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PodminkyScreen() {
  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Podmínky a GDPR</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Obchodní podmínky */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Obchodní podmínky</Text>
          <Text style={s.date}>Platné od: 26. 1. 2026</Text>

          <Text style={s.heading}>1. Základní ustanovení</Text>
          <Text style={s.text}>
            Tyto podmínky upravují používání platformy Samopěstitelé.cz (dále jen "Platforma"), která
            propojuje samopěstitele s koncovými zákazníky. Platforma je určena především fyzickým osobám,
            které prodávají přebytky ze své zahrady a nespadají pod živnostenské podnikání. Provozovatelem
            je [DOPLNIT JMÉNO/NÁZEV], se sídlem [DOPLNIT ADRESA] (dále jen "Provozovatel").
          </Text>

          <Text style={s.heading}>2. Odpovědnost samopěstitele</Text>
          <Text style={s.text}>Registrací na Platformě samopěstitel prohlašuje a zavazuje se, že:</Text>
          <Text style={s.bullet}>• Nese plnou odpovědnost za pravdivost, kvalitu a bezpečnost nabízených produktů</Text>
          <Text style={s.bullet}>• Dodržuje základní hygienické standardy při pěstování a prodeji produktů</Text>
          <Text style={s.bullet}>• Produkty pocházejí z vlastního pěstování nebo chovu</Text>
          <Text style={s.bullet}>• Produkty jsou určeny k přímé spotřebě a neobsahují škodlivé látky</Text>
          <Text style={s.bullet}>• V případě živočišných produktů (vejce, mléko, med) dodržuje zákonné požadavky</Text>
          <Text style={s.bullet}>• Neprodává produkty ve velkém množství, které by vyžadovalo živnostenské oprávnění</Text>

          <Text style={s.heading}>3. Vyloučení odpovědnosti Provozovatele</Text>
          <Text style={s.text}>Provozovatel Platformy:</Text>
          <Text style={s.bullet}>• Neručí za kvalitu, bezpečnost ani původ produktů nabízených pěstiteli</Text>
          <Text style={s.bullet}>• Není stranou kupní smlouvy mezi pěstitelem a zákazníkem</Text>
          <Text style={s.bullet}>• Neprovádí kontrolu hygienických podmínek u pěstitelů</Text>
          <Text style={s.bullet}>• Nenese odpovědnost za případné zdravotní komplikace vzniklé konzumací produktů</Text>

          <Text style={s.heading}>4. Prodej přebytků vs. podnikání</Text>
          <Text style={s.text}>
            Tato Platforma je určena pro neformální prodej přebytků ze zahrady. Pokud samopěstitel
            pravidelně prodává velké množství produktů, může být povinen získat živnostenské oprávnění
            podle zákona č. 455/1991 Sb., živnostenský zákon.
          </Text>

          <Text style={s.heading}>5. Práva a povinnosti</Text>
          <Text style={s.text}>
            Provozovatel si vyhrazuje právo odstranit nabídku nebo zablokovat účet samopěstitele v případě
            porušení těchto podmínek nebo na základě opakovaných stížností zákazníků.
          </Text>
        </View>

        {/* GDPR */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔒 Zásady ochrany osobních údajů (GDPR)</Text>
          <Text style={s.date}>Platné od: 26. 1. 2026</Text>

          <Text style={s.heading}>1. Správce osobních údajů</Text>
          <Text style={s.text}>
            Správcem osobních údajů je Provozovatel Platformy [DOPLNIT JMÉNO/NÁZEV], se sídlem
            [DOPLNIT ADRESA], email: [DOPLNIT EMAIL], telefon: [DOPLNIT TELEFON].
          </Text>

          <Text style={s.heading}>2. Zpracovávané osobní údaje</Text>
          <Text style={s.text}>V rámci registrace a používání Platformy zpracováváme:</Text>
          <Text style={s.bullet}>• Jméno a příjmení</Text>
          <Text style={s.bullet}>• Email</Text>
          <Text style={s.bullet}>• Telefon</Text>
          <Text style={s.bullet}>• Adresa farmy (včetně GPS souřadnic)</Text>
          <Text style={s.bullet}>• Název farmy</Text>
          <Text style={s.bullet}>• Fotografie farmy a produktů</Text>
          <Text style={s.bullet}>• IP adresa a cookies pro technický provoz</Text>

          <Text style={s.heading}>3. Vaše práva</Text>
          <Text style={s.text}>V souladu s GDPR máte právo na:</Text>
          <Text style={s.bullet}>• Přístup k osobním údajům</Text>
          <Text style={s.bullet}>• Opravu nepřesných údajů</Text>
          <Text style={s.bullet}>• Výmaz údajů ("právo být zapomenut")</Text>
          <Text style={s.bullet}>• Omezení zpracování</Text>
          <Text style={s.bullet}>• Podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz)</Text>

          <Text style={s.heading}>4. Cookies</Text>
          <Text style={s.text}>
            Platforma používá pouze nezbytné technické cookies pro své fungování.
            Nepoužíváme marketingové ani analytické cookies bez vašeho souhlasu.
          </Text>
        </View>

        {/* Kontakt */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📧 Kontakt</Text>
          <Text style={s.text}>
            Pro dotazy ohledně ochrany osobních údajů nebo obchodních podmínek nás kontaktujte:
          </Text>
          <Text style={s.contact}>Email: [DOPLNIT EMAIL]</Text>
          <Text style={s.contact}>Telefon: [DOPLNIT TELEFON]</Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Platné od 26. 1. 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  backBtn: {},
  backBtnText: { fontSize: 14, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 760 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 40, paddingBottom: 64,
  },

  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  date: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  heading: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 18, marginBottom: 8 },
  text: { fontSize: 14, color: '#4b5563', lineHeight: 24, marginBottom: 10 },
  bullet: { fontSize: 14, color: '#4b5563', lineHeight: 24, marginBottom: 6, paddingLeft: 8 },
  contact: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },

  footer: {
    marginTop: 20, paddingTop: 20,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: { fontSize: 12, color: '#9ca3af' },
});
