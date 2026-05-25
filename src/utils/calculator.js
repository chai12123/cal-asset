/**
 * ===================================================================
 * เครื่องคำนวณค่าโอนบ้าน-ที่ดิน (ประเทศไทย)
 * อ้างอิงอัตราและมาตรการปี 2568-2569
 * -------------------------------------------------------------------
 * วิธีใช้: calculateTransferCosts(input) -> ผลลัพธ์ object
 * ===================================================================
 */

// ----- ค่าคงที่ (แก้ตรงนี้ที่เดียวถ้ากฎหมายเปลี่ยน) -----
const CONFIG = {
  // อัตราปกติ
  TRANSFER_FEE_RATE: 0.02,        // ค่าธรรมเนียมการโอน 2% ของราคาประเมิน
  MORTGAGE_FEE_RATE: 0.01,        // ค่าจดจำนอง 1% ของวงเงินกู้
  MORTGAGE_FEE_CAP: 200000,       // ค่าจดจำนองสูงสุดไม่เกิน 200,000 บาท
  SBT_RATE: 0.033,                // ภาษีธุรกิจเฉพาะ 3.3% (รวมภาษีท้องถิ่นแล้ว: 3% + 0.3%)
  STAMP_DUTY_RATE: 0.005,         // อากรแสตมป์ 0.5%

  // อัตรามาตรการลดหย่อน 2568-2569
  REDUCED_RATE: 0.0001,           // ค่าโอน/จดจำนองลดเหลือ 0.01%
  MEASURE_PRICE_CAP: 7000000,     // เพดานราคาบ้านสำหรับมาตรการ 7 ล้านบาท
  MEASURE_END_DATE: '2026-06-30', // วันสิ้นสุดมาตรการ 30 มิ.ย. 2569

  // สิทธิยกเว้นภาษีเงินได้ สำหรับอสังหาฯ นอกเขต
  RURAL_EXEMPTION: 200000,        // ยกเว้น 200,000 บาท สำหรับนอกเขต กทม./เทศบาล/พัทยา

  // เพดานภาษีเงินได้บุคคลธรรมดา = 20% ของราคาประเมิน
  PIT_WHT_CAP_RATE: 0.20,

  // อัตราภาษีเงินได้นิติบุคคลหัก ณ ที่จ่าย
  CIT_WHT_RATE: 0.01,             // 1% ของราคาที่สูงกว่า
};

/**
 * ตารางหักค่าใช้จ่ายเหมาตามจำนวนปีถือครอง (พ.ร.ฎ. ฉบับที่ 165)
 * key = จำนวนปีถือครอง, value = สัดส่วนค่าใช้จ่ายที่หักได้
 */
const EXPENSE_DEDUCTION_TABLE = {
  1: 0.92,
  2: 0.84,
  3: 0.77,
  4: 0.71,
  5: 0.65,
  6: 0.60,
  7: 0.55,
  8: 0.50,  // 8 ปีขึ้นไป ใช้ 50% ทั้งหมด
};

/**
 * ตารางอัตราภาษีเงินได้ขั้นบันได สำหรับคำนวณภาษีหัก ณ ที่จ่ายจากการขายอสังหาฯ
 * ** สำคัญมาก: ขั้นแรกเริ่ม 5% ตั้งแต่บาทแรก — ไม่มีช่วงยกเว้น 150,000 **
 * (ต่างจากตารางภาษีเงินได้ประจำปี — ห้ามสับสน)
 */
const PIT_BRACKETS = [
  { upTo: 300000,    rate: 0.05 },
  { upTo: 500000,    rate: 0.10 },
  { upTo: 750000,    rate: 0.15 },
  { upTo: 1000000,   rate: 0.20 },
  { upTo: 2000000,   rate: 0.25 },
  { upTo: 5000000,   rate: 0.30 },
  { upTo: Infinity,  rate: 0.35 },
];

/**
 * คำนวณภาษีจากเงินได้แบบขั้นบันได (progressive)
 * @param {number} income - เงินได้ที่นำมาคำนวณ
 * @returns {number} จำนวนภาษี
 */
function calcProgressiveTax(income) {
  if (income <= 0) return 0;
  let tax = 0;
  let lowerBound = 0;
  for (const bracket of PIT_BRACKETS) {
    if (income > lowerBound) {
      // ส่วนของเงินได้ที่ตกอยู่ในขั้นนี้
      const taxableInThisBracket = Math.min(income, bracket.upTo) - lowerBound;
      tax += taxableInThisBracket * bracket.rate;
      lowerBound = bracket.upTo;
    } else {
      break;
    }
  }
  return tax;
}

/**
 * แปลงจำนวนปีถือครองให้เป็นปีที่ใช้คำนวณได้จริง
 * กฎ: เศษของปีนับเป็น 1 ปีเต็ม, เกิน 10 ปีนับแค่ 10 ปี
 * @param {number} years - จำนวนปีถือครอง (ผู้ใช้กรอก)
 * @returns {number} ปีที่ใช้คำนวณ (1-10)
 */
function normalizeHoldingYears(years) {
  let y = Math.ceil(years);        // เศษปีปัดขึ้นเป็น 1 ปีเต็ม
  if (y < 1) y = 1;                // อย่างน้อย 1 ปี
  if (y > 10) y = 10;              // เกิน 10 ปีนับแค่ 10
  return y;
}

/**
 * คำนวณภาษีเงินได้หัก ณ ที่จ่าย กรณีผู้ขายเป็นบุคคลธรรมดา
 * วิธี 6 ขั้นตอน ตามที่กรมที่ดิน/สรรพากรใช้
 * @param {number} appraisedValue - ราคาประเมิน (ใช้เป็นฐานเสมอสำหรับบุคคลธรรมดา)
 * @param {number} holdingYears - จำนวนปีถือครอง (ค่าที่ผู้ใช้กรอก)
 * @param {boolean} isRural - อยู่นอกเขต กทม./เทศบาล/พัทยา หรือไม่
 * @returns {object} รายละเอียดการคำนวณ
 */
function calcPersonalIncomeWHT(appraisedValue, holdingYears, isRural) {
  const years = normalizeHoldingYears(holdingYears);

  // ขั้น 1: ตั้งราคาประเมินเป็นเงินได้
  // ขั้น 1.5: ถ้าอยู่นอกเขต หักสิทธิยกเว้น 200,000 ก่อน
  let incomeBase = appraisedValue;
  if (isRural) {
    incomeBase = Math.max(0, incomeBase - CONFIG.RURAL_EXEMPTION);
  }

  // ขั้น 2: หักค่าใช้จ่ายเหมาตามปีถือครอง
  const deductionRate = EXPENSE_DEDUCTION_TABLE[years] || 0.50; // 8 ปีขึ้นไป = 50%
  const expense = incomeBase * deductionRate;

  // ขั้น 3: เงินได้สุทธิ
  const netIncome = incomeBase - expense;

  // ขั้น 4: หารด้วยจำนวนปีถือครอง = เงินได้เฉลี่ยต่อปี
  const incomePerYear = netIncome / years;

  // ขั้น 5: คำนวณภาษีจากเงินได้เฉลี่ยต่อปี ตามอัตราขั้นบันได
  const taxPerYear = calcProgressiveTax(incomePerYear);

  // ขั้น 6: คูณกลับด้วยจำนวนปีถือครอง
  let totalTax = taxPerYear * years;

  // เพดาน: ภาษีต้องไม่เกิน 20% ของราคาประเมิน (กรณีไม่มุ่งค้ากำไร)
  const cap = appraisedValue * CONFIG.PIT_WHT_CAP_RATE;
  let cappedFlag = false;
  if (totalTax > cap) {
    totalTax = cap;
    cappedFlag = true;
  }

  return {
    amount: Math.round(totalTax),
    detail: {
      yearsUsed: years,
      deductionRate: deductionRate,
      expense: Math.round(expense),
      netIncome: Math.round(netIncome),
      incomePerYear: Math.round(incomePerYear),
      taxPerYear: Math.round(taxPerYear),
      capApplied: cappedFlag,
    },
  };
}

/**
 * คำนวณภาษีเงินได้หัก ณ ที่จ่าย กรณีผู้ขายเป็นนิติบุคคล
 * ง่ายกว่ามาก: 1% ของราคาที่สูงกว่า (ราคาขาย vs ราคาประเมิน)
 */
function calcCorporateIncomeWHT(sellingPrice, appraisedValue) {
  const base = Math.max(sellingPrice, appraisedValue);
  return {
    amount: Math.round(base * CONFIG.CIT_WHT_RATE),
    detail: { baseUsed: base },
  };
}

/**
 * ===================================================================
 * ฟังก์ชันหลัก: คำนวณค่าใช้จ่ายทั้งหมด
 * ===================================================================
 * @param {object} input
 *   - sellingPrice {number}      ราคาซื้อขาย
 *   - appraisedValue {number}    ราคาประเมินกรมที่ดิน
 *   - sellerType {string}        'individual' | 'corporate'
 *   - holdingYears {number}      จำนวนปีถือครอง
 *   - inHouseRegOver1Year {bool} ผู้ขายมีชื่อในทะเบียนบ้านเกิน 1 ปี
 *   - hasLoan {boolean}          ผู้ซื้อกู้ธนาคารหรือไม่
 *   - loanAmount {number}        วงเงินกู้ (ถ้ากู้)
 *   - isRural {boolean}          อสังหาฯ อยู่นอกเขต กทม./เทศบาล/พัทยา
 *   - mortgageMeasureFor7M {bool} ค่าจดจำนอง 0.01% ใช้เพดาน 7 ล้าน (true)
 *                                 หรือ 3 ล้าน (false) — ให้ผู้ใช้เลือกได้
 *                                 เพราะข้อมูลกฎหมายยังขัดกัน
 *   - calculationDate {string}   วันที่คำนวณ (ISO) — default = วันนี้
 * @returns {object} ผลลัพธ์ครบถ้วน
 */
export function calculateTransferCosts(input) {
  // --- 1. เตรียมข้อมูล ตั้งค่า default ---
  const sellingPrice = Number(input.sellingPrice) || 0;
  const appraisedValue = Number(input.appraisedValue) || 0;
  const sellerType = input.sellerType || 'individual';
  const holdingYears = Number(input.holdingYears) || 0;
  const inHouseRegOver1Year = !!input.inHouseRegOver1Year;
  const hasLoan = !!input.hasLoan;
  const loanAmount = hasLoan ? (Number(input.loanAmount) || 0) : 0;
  const isRural = !!input.isRural;
  const mortgageMeasureFor7M = input.mortgageMeasureFor7M !== false; // default true
  const calcDate = input.calculationDate
    ? new Date(input.calculationDate)
    : new Date();

  // --- 2. ตรวจว่าเข้ามาตรการลดหย่อน 0.01% หรือไม่ ---
  // เงื่อนไข: ราคาขาย + ราคาประเมิน <= 7 ล้าน, วงเงินกู้ <= 7 ล้าน,
  //          วันที่คำนวณยังไม่เกิน 30 มิ.ย. 2569
  const measureEnd = new Date(CONFIG.MEASURE_END_DATE);
  const withinDate = calcDate <= measureEnd;
  const priceWithinCap =
    sellingPrice <= CONFIG.MEASURE_PRICE_CAP &&
    appraisedValue <= CONFIG.MEASURE_PRICE_CAP;
  const loanWithinCap = !hasLoan || loanAmount <= CONFIG.MEASURE_PRICE_CAP;

  // มาตรการ "ค่าโอน" — เข้าเงื่อนไขถ้าราคาทั้งสอง <= 7 ล้าน และยังไม่หมดเวลา
  const transferMeasureEligible = withinDate && priceWithinCap;

  // มาตรการ "ค่าจดจำนอง" — เพดานอาจเป็น 7 ล้าน หรือ 3 ล้าน (ผู้ใช้เลือก)
  const mortgageCap = mortgageMeasureFor7M
    ? CONFIG.MEASURE_PRICE_CAP
    : 3000000;
  const mortgageMeasureEligible =
    withinDate &&
    hasLoan &&
    loanAmount <= mortgageCap &&
    sellingPrice <= mortgageCap &&
    appraisedValue <= mortgageCap;

  // --- 3. ค่าธรรมเนียมการโอน (ฐาน = ราคาประเมิน) ---
  const transferRate = transferMeasureEligible
    ? CONFIG.REDUCED_RATE
    : CONFIG.TRANSFER_FEE_RATE;
  const transferFee = appraisedValue * transferRate;
  // เก็บค่าปกติไว้เปรียบเทียบ (โชว์ว่าประหยัดเท่าไหร่)
  const transferFeeNormal = appraisedValue * CONFIG.TRANSFER_FEE_RATE;

  // --- 4. ค่าจดจำนอง (ฐาน = วงเงินกู้) ---
  let mortgageFee = 0;
  let mortgageFeeNormal = 0;
  if (hasLoan) {
    const mortgageRate = mortgageMeasureEligible
      ? CONFIG.REDUCED_RATE
      : CONFIG.MORTGAGE_FEE_RATE;
    mortgageFee = loanAmount * mortgageRate;
    mortgageFeeNormal = Math.min(
      loanAmount * CONFIG.MORTGAGE_FEE_RATE,
      CONFIG.MORTGAGE_FEE_CAP
    );
    // เพดาน 200,000 ใช้กับอัตราปกติ (อัตราลดหย่อนยอดเล็กไม่ถึงเพดานอยู่แล้ว)
    if (!mortgageMeasureEligible) {
      mortgageFee = Math.min(mortgageFee, CONFIG.MORTGAGE_FEE_CAP);
    }
  }

  // --- 5. ภาษีธุรกิจเฉพาะ vs อากรแสตมป์ (เสียอย่างใดอย่างหนึ่ง) ---
  // เกณฑ์: ถือครองไม่ถึง 5 ปี และไม่มีชื่อทะเบียนบ้านเกิน 1 ปี -> เสีย SBT
  //        นอกนั้น -> เสียอากรแสตมป์
  // ฐานคำนวณ = ราคาที่สูงกว่า (ราคาขาย vs ราคาประเมิน)
  const sbtStampBase = Math.max(sellingPrice, appraisedValue);
  const mustPaySBT = holdingYears < 5 && !inHouseRegOver1Year;

  let specificBusinessTax = 0;
  let stampDuty = 0;
  if (mustPaySBT) {
    specificBusinessTax = sbtStampBase * CONFIG.SBT_RATE;
  } else {
    stampDuty = sbtStampBase * CONFIG.STAMP_DUTY_RATE;
  }

  // --- 6. ภาษีเงินได้หัก ณ ที่จ่าย ---
  let incomeWHT;
  if (sellerType === 'corporate') {
    incomeWHT = calcCorporateIncomeWHT(sellingPrice, appraisedValue);
  } else {
    incomeWHT = calcPersonalIncomeWHT(appraisedValue, holdingYears, isRural);
  }

  // --- 7. รวมยอด แยกตามผู้จ่าย (ตามธรรมเนียม) ---
  // ผู้ซื้อจ่าย: ค่าโอน + ค่าจดจำนอง
  // ผู้ขายจ่าย: SBT/อากร + ภาษีเงินได้
  const buyerTotal = transferFee + mortgageFee;
  const sellerTotal = specificBusinessTax + stampDuty + incomeWHT.amount;
  const grandTotal = buyerTotal + sellerTotal;

  // --- 8. คำนวณเงินที่ประหยัดได้จากมาตรการ ---
  const savings =
    (transferFeeNormal - transferFee) +
    (mortgageFeeNormal - mortgageFee);

  // --- 9. ส่งผลลัพธ์ ---
  return {
    // ยอดสรุป
    summary: {
      buyerTotal: Math.round(buyerTotal),
      sellerTotal: Math.round(sellerTotal),
      grandTotal: Math.round(grandTotal),
      totalSavings: Math.round(savings),
    },
    // รายการย่อย
    items: {
      transferFee: {
        amount: Math.round(transferFee),
        normalAmount: Math.round(transferFeeNormal),
        rate: transferRate,
        measureApplied: transferMeasureEligible,
        paidBy: 'buyer',
      },
      mortgageFee: {
        amount: Math.round(mortgageFee),
        normalAmount: Math.round(mortgageFeeNormal),
        applicable: hasLoan,
        measureApplied: mortgageMeasureEligible,
        paidBy: 'buyer',
      },
      specificBusinessTax: {
        amount: Math.round(specificBusinessTax),
        applicable: mustPaySBT,
        paidBy: 'seller',
      },
      stampDuty: {
        amount: Math.round(stampDuty),
        applicable: !mustPaySBT,
        paidBy: 'seller',
      },
      incomeWHT: {
        amount: incomeWHT.amount,
        sellerType: sellerType,
        detail: incomeWHT.detail,
        paidBy: 'seller',
      },
    },
    // ข้อมูลสถานะมาตรการ (เอาไปโชว์ในแถบเตือน)
    measureStatus: {
      transferEligible: transferMeasureEligible,
      mortgageEligible: mortgageMeasureEligible,
      withinDate: withinDate,
      endDate: CONFIG.MEASURE_END_DATE,
      daysLeft: Math.max(
        0,
        Math.ceil((measureEnd - calcDate) / (1000 * 60 * 60 * 24))
      ),
    },
    // เก็บ input ไว้อ้างอิง
    input: { sellingPrice, appraisedValue, sellerType, holdingYears,
             inHouseRegOver1Year, hasLoan, loanAmount, isRural },
  };
}
