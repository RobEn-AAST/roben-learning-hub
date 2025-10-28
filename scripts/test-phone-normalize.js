// Quick test for Egyptian phone normalization
function normalize(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  digits = digits.replace(/^(?:\+|00)?20/, '');
  if (digits.length === 10 && /^[1-9]/.test(digits)) {
    digits = '0' + digits;
  }
  const m = digits.match(/^(010|011|012|015)\d{8}$/);
  return m ? digits : null;
}

const cases = [
  { in: '01012345678', out: '01012345678' },
  { in: '+20 10 1234 5678', out: '01012345678' },
  { in: '011-987-6543', out: null },
  { in: '01599988877', out: '01599988877' },
  { in: '01234567890', out: '01234567890' },
  { in: null, out: null },
  { in: '00201012345678', out: '01012345678' }
];

let passed = 0;
for (const c of cases) {
  const r = normalize(c.in);
  const ok = r === c.out;
  console.log(`${ok ? 'PASS' : 'FAIL'} - input=${c.in} => got=${r} expected=${c.out}`);
  if (ok) passed++;
}

console.log(`${passed}/${cases.length} tests passed`);
process.exit(passed === cases.length ? 0 : 1);
