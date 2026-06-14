import type { HelpContent } from './types';

// Swedish help content.
export const helpSv: HelpContent = {
  title: 'Så fungerar LinkPortal',
  intro:
    'LinkPortal är teamets gemensamma katalog över länkar — en ”lösenordshanterare för länkar”. Den här guiden förklarar hur du hittar, öppnar och hanterar länkar, och vad varje roll kan göra.',
  fallbackNote: 'Den här guiden är ännu inte översatt till ditt språk och visas därför på engelska.',
  sections: [
    {
      id: 'getting-started',
      title: 'Kom igång',
      paragraphs: [
        'Logga in med användarnamnet och lösenordet du har fått. Första gången du loggar in kan du behöva välja ett nytt lösenord.',
        'Översikten visar dina länkar. Kategorier listas i sidofältet till vänster; själva länkarna visas i huvudytan.',
        'Växla mellan Kortvy (logotyper och detaljer) och Detaljvy (en kompakt tabell) med knappen ovanför listan. Ditt val sparas i den här webbläsaren.',
      ],
    },
    {
      id: 'finding',
      title: 'Hitta och öppna länkar',
      paragraphs: [
        'Skriv i sökrutan högst upp för att filtrera länkar på namn, URL, team, taggar med mera. Tryck Ctrl+K för att hoppa direkt till sökningen, och Esc eller ✕-knappen för att rensa den.',
        'Klicka på ett länkkort (eller på Öppna-knappen) för att öppna länken i en ny flik. Använd Kopiera-knappen för att kopiera URL:en.',
        'En liten färgad prick visar länkens övervakningsstatus: grönt betyder nåbar, rött betyder nere och grått betyder att den inte övervakas.',
      ],
    },
    {
      id: 'favorites',
      title: 'Favoriter och senast tillagda',
      paragraphs: [
        'Markera länkar du använder ofta med ★-stjärnan. De samlas under Favoriter i sidofältet för snabb åtkomst. Favoriter är personliga för ditt konto.',
        'Vyn Senast tillagda listar de nyaste länkarna. Du kan välja hur många den visar under Inställningar.',
      ],
    },
    {
      id: 'categories-links',
      title: 'Kategorier och att lägga till länkar',
      paragraphs: [
        'Länkar organiseras i kategorier som kan ligga i flera nivåer. Klicka på en kategori i sidofältet för att bara se dess länkar; siffran bredvid visar hur många länkar den innehåller.',
        'Editor och admin kan lägga till en länk med ”+ Ny länk” samt redigera eller ta bort befintliga. En länk har namn, URL, kategori, miljö (Prod/Test/Dev), ägande team, taggar, en valfri beskrivning och en valfri logotypbild.',
        'URL:er kan använda scheman som https://, rdp:// och ssh:// — ett schema krävs (enbart ett värdnamn fungerar inte).',
      ],
    },
    {
      id: 'monitoring',
      title: 'Övervakning och larm',
      paragraphs: [
        'LinkPortal kan regelbundet kontrollera att länkar svarar. HTTP/HTTPS-länkar kontrolleras med en lätt förfrågan; rdp/ssh-länkar kontrolleras med en TCP-portkontroll.',
        'Klicka på statuspricken för att köra ett direkt test (editor och admin). Tiden ”Senast lyckad” visar när länken senast svarade.',
        'När en länk går från uppe till nere visas den under Övervakningslarm. Länkar markerade med ”Övervaka inte” testas aldrig och visar alltid en neutral prick. Admin ställer in kontrollintervall och timeout under Inställningar.',
      ],
    },
    {
      id: 'trash',
      title: 'Papperskorg',
      paragraphs: [
        'Att ta bort en länk flyttar den till Papperskorgen i stället för att radera den direkt. Admin kan öppna Papperskorgen för att återställa en länk eller radera den permanent.',
      ],
    },
    {
      id: 'import-export',
      title: 'Import och export',
      paragraphs: [
        'Öppna Inställningar → Import/export för att ladda ner alla länkar som en JSON-säkerhetskopia. Alla användare kan exportera.',
        'Admin kan importera länkar från en tidigare exporterad fil. Importen är icke-förstörande: den lägger till nya länkar och hoppar över sådana som redan finns (samma namn och URL) — inget skrivs över eller tas bort.',
      ],
    },
    {
      id: 'extension',
      title: 'Webbläsartillägg',
      paragraphs: [
        'Chrome/Edge-tillägget gör dina länkar nåbara med ett klick från verktygsfältet. Du kan söka och öppna länkar, spara den aktuella fliken till en kategori (eller Inkorgen) och stjärnmärka favoriter.',
        'Det kan meddela dig när nya länkar läggs till, och du kan öppna popupen med ett kortkommando (Ctrl+Shift+L som standard). Logga in en gång med din server-URL och ditt konto.',
      ],
    },
    {
      id: 'settings',
      title: 'Inställningar',
      paragraphs: [
        'Inställningar innehåller dina personliga val och, för admin, alternativ som gäller hela webbplatsen. Alla kan ändra gränssnittsspråk, färgtema (sparas på ditt konto) och hur många länkar vyn Senast tillagda visar.',
        'Admin kan hantera kategorier, konfigurera övervakning, ange den publika webbappsadress som tillägget använder, samt importera länkar.',
      ],
    },
    {
      id: 'roles',
      title: 'Roller',
      paragraphs: [
        'Viewer — bläddra, söka, öppna och favoritmarkera länkar samt exportera.',
        'Editor — allt en viewer kan göra, plus att lägga till och redigera länkar och köra hälsotester.',
        'Admin — full kontroll: ta bort och återställa länkar, hantera kategorier och användare, importera länkar samt ändra övervaknings- och webbplatsinställningar.',
      ],
    },
    {
      id: 'version',
      title: 'Version och uppdateringar',
      paragraphs: [
        'Den aktuella byggversionen visas under Inställningar → Om. Den härleds från projektets källkod, så servern och en lokal kopia visar samma version när de står på samma utgåva — praktiskt för att bekräfta att en uppdatering gått igenom.',
      ],
    },
  ],
};
