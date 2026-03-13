export const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank' },
  { code: '063', name: 'Diamond Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '084', name: 'Enterprise Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'GTBank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
] as const;

// Mock NIP name enquiry
const MOCK_NAMES = [
  'Amaka Osei', 'Chukwuemeka Nwankwo', 'Funmilayo Adeyemi', 'Olumide Bakare',
  'Ngozi Okonkwo', 'Babajide Sanusi', 'Kelechi Eze', 'Aisha Mohammed',
];

export function mockNameEnquiry(accountNumber: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = parseInt(accountNumber.slice(-1)) % MOCK_NAMES.length;
      resolve(MOCK_NAMES[index]);
    }, 1500);
  });
}
