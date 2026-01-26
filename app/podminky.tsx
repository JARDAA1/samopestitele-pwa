import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PodminkyScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Podmínky a GDPR</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Obchodní podmínky */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Obchodní podmínky</Text>
          <Text style={styles.date}>Platné od: 26. 1. 2026</Text>

          <Text style={styles.heading}>1. Základní ustanovení</Text>
          <Text style={styles.text}>
            Tyto obchodní podmínky upravují používání platformy Samopěstitelé.cz (dále jen "Platforma"), která propojuje pěstitele s koncovými zákazníky. Provozovatelem Platformy je [DOPLNIT NÁZEV SPOLEČNOSTI], IČO: [DOPLNIT], se sídlem [DOPLNIT] (dále jen "Provozovatel").
          </Text>

          <Text style={styles.heading}>2. Odpovědnost pěstitele</Text>
          <Text style={styles.text}>
            Registrací na Platformě pěstitel prohlašuje a zavazuje se, že:
          </Text>
          <Text style={styles.bullet}>• Nese plnou odpovědnost za pravdivost, kvalitu a bezpečnost nabízených produktů</Text>
          <Text style={styles.bullet}>• Dodržuje platné hygienické a zdravotní standardy ČR při pěstování a prodeji potravin</Text>
          <Text style={styles.bullet}>• Má v pořádku všechna potřebná povolení a registrace podle českého práva</Text>
          <Text style={styles.bullet}>• Produkty jsou v souladu se zákonem č. 110/1997 Sb., o potravinách</Text>
          <Text style={styles.bullet}>• V případě prodeje živočišných produktů má platnou registraci u Státní veterinární správy</Text>

          <Text style={styles.heading}>3. Vyloučení odpovědnosti Provozovatele</Text>
          <Text style={styles.text}>
            Provozovatel Platformy:
          </Text>
          <Text style={styles.bullet}>• Neručí za kvalitu, bezpečnost ani původ produktů nabízených pěstiteli</Text>
          <Text style={styles.bullet}>• Není stranou kupní smlouvy mezi pěstitelem a zákazníkem</Text>
          <Text style={styles.bullet}>• Neprovádí kontrolu hygienických podmínek u pěstitelů</Text>
          <Text style={styles.bullet}>• Nenese odpovědnost za případné zdravotní komplikace vzniklé konzumací produktů</Text>

          <Text style={styles.heading}>4. Práva a povinnosti</Text>
          <Text style={styles.text}>
            Provozovatel si vyhrazuje právo odstranit nabídku nebo zablokovat účet pěstitele v případě porušení těchto podmínek nebo na základě stížností zákazníků.
          </Text>
        </View>

        {/* Zásady ochrany osobních údajů */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Zásady ochrany osobních údajů (GDPR)</Text>
          <Text style={styles.date}>Platné od: 26. 1. 2026</Text>

          <Text style={styles.heading}>1. Správce osobních údajů</Text>
          <Text style={styles.text}>
            Správcem osobních údajů je Provozovatel Platformy [DOPLNIT NÁZEV], IČO: [DOPLNIT], se sídlem [DOPLNIT], email: [DOPLNIT EMAIL].
          </Text>

          <Text style={styles.heading}>2. Zpracovávané osobní údaje</Text>
          <Text style={styles.text}>
            V rámci registrace a používání Platformy zpracováváme následující osobní údaje:
          </Text>
          <Text style={styles.bullet}>• Jméno a příjmení</Text>
          <Text style={styles.bullet}>• Email</Text>
          <Text style={styles.bullet}>• Telefon</Text>
          <Text style={styles.bullet}>• Adresa farmy (včetně GPS souřadnic)</Text>
          <Text style={styles.bullet}>• Název farmy</Text>
          <Text style={styles.bullet}>• Fotografie farmy a produktů</Text>
          <Text style={styles.bullet}>• IP adresa a cookies pro technický provoz</Text>

          <Text style={styles.heading}>3. Účel a právní základ zpracování</Text>
          <Text style={styles.text}>
            Osobní údaje zpracováváme na základě:
          </Text>
          <Text style={styles.bullet}>• Vašeho souhlasu (čl. 6 odst. 1 písm. a) GDPR)</Text>
          <Text style={styles.bullet}>• Plnění smlouvy o poskytování služeb (čl. 6 odst. 1 písm. b) GDPR)</Text>
          <Text style={styles.bullet}>• Oprávněného zájmu Provozovatele na provozování Platformy (čl. 6 odst. 1 písm. f) GDPR)</Text>

          <Text style={styles.text}>
            Účelem zpracování je:
          </Text>
          <Text style={styles.bullet}>• Provoz a správa uživatelských účtů</Text>
          <Text style={styles.bullet}>• Zobrazení profilu pěstitele zákazníkům</Text>
          <Text style={styles.bullet}>• Komunikace s uživateli</Text>
          <Text style={styles.bullet}>• Zajištění bezpečnosti a prevence zneužití</Text>

          <Text style={styles.heading}>4. Doba uchovávání údajů</Text>
          <Text style={styles.text}>
            Osobní údaje uchováváme po dobu existence uživatelského účtu. Po smazání účtu jsou údaje vymazány do 30 dnů, pokud nestanoví zákon jinak.
          </Text>

          <Text style={styles.heading}>5. Vaše práva</Text>
          <Text style={styles.text}>
            V souladu s GDPR máte právo na:
          </Text>
          <Text style={styles.bullet}>• Přístup k osobním údajům</Text>
          <Text style={styles.bullet}>• Opravu nepřesných údajů</Text>
          <Text style={styles.bullet}>• Výmaz údajů ("právo být zapomenut")</Text>
          <Text style={styles.bullet}>• Omezení zpracování</Text>
          <Text style={styles.bullet}>• Přenositelnost údajů</Text>
          <Text style={styles.bullet}>• Odvolání souhlasu se zpracováním</Text>
          <Text style={styles.bullet}>• Podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz)</Text>

          <Text style={styles.heading}>6. Předávání údajů třetím stranám</Text>
          <Text style={styles.text}>
            Vaše osobní údaje nepředáváme třetím stranám kromě případů, kdy je to nezbytné pro provoz Platformy (např. hosting, zálohovací služby). Všichni zpracovatelé jsou vázáni smlouvou o zpracování osobních údajů.
          </Text>

          <Text style={styles.heading}>7. Cookies</Text>
          <Text style={styles.text}>
            Platforma používá pouze nezbytné technické cookies pro své fungování. Nepoužíváme marketingové ani analytické cookies bez vašeho souhlasu.
          </Text>
        </View>

        {/* Kontakt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Kontakt</Text>
          <Text style={styles.text}>
            Pro dotazy ohledně ochrany osobních údajů nebo obchodních podmínek nás kontaktujte:
          </Text>
          <Text style={styles.contact}>Email: [DOPLNIT EMAIL]</Text>
          <Text style={styles.contact}>Telefon: [DOPLNIT TELEFON]</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tyto podmínky jsou platné od 26. 1. 2026
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7B1FA2',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A1B9A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 5,
    paddingLeft: 10,
  },
  contact: {
    fontSize: 14,
    color: '#7B1FA2',
    fontWeight: '600',
    marginBottom: 5,
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
