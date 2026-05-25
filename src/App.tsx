import React, { useState, useEffect, useMemo, useRef } from 'react';
import { calculateTransferCosts } from './utils/calculator';
import { Info, Share2, Copy, Link as LinkIcon, AlertTriangle, CheckCircle2, MessageCircle } from 'lucide-react';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(Math.round(num));
}

function parseNumber(str: string): number | '' {
  if (!str) return '';
  const num = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(num) ? '' : num;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'both' | 'buyer' | 'seller'>('both');
  
  // Form state
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [appraisedValue, setAppraisedValue] = useState<number | ''>('');
  const [useSellingPriceAsAppraised, setUseSellingPriceAsAppraised] = useState(false);
  const [sellerType, setSellerType] = useState<'individual' | 'corporate'>('individual');
  const [holdingYears, setHoldingYears] = useState<number | ''>('');
  const [inHouseRegOver1Year, setInHouseRegOver1Year] = useState(true);
  const [hasLoan, setHasLoan] = useState(true);
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [isRural, setIsRural] = useState(false);

  // Tooltip tracking
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Init from URL
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.has('sp')) setSellingPrice(Number(params.get('sp')));
    if (params.has('av')) setAppraisedValue(Number(params.get('av')));
    if (params.has('st')) setSellerType(params.get('st') as any);
    if (params.has('hy')) setHoldingYears(Number(params.get('hy')));
    if (params.has('ih')) setInHouseRegOver1Year(!['0', 'false'].includes(params.get('ih')!));
    if (params.has('hl')) setHasLoan(!['0', 'false'].includes(params.get('hl')!));
    if (params.has('la')) setLoanAmount(Number(params.get('la')));
    if (params.has('ir')) setIsRural(!['0', 'false'].includes(params.get('ir')!));
    if (params.has('vm')) setViewMode(params.get('vm') as any);
  }, []);

  // Update URL
  useEffect(() => {
    if (!initRef.current) return;
    const params = new URLSearchParams();
    if (sellingPrice) params.set('sp', sellingPrice.toString());
    if (appraisedValue) params.set('av', appraisedValue.toString());
    params.set('st', sellerType);
    if (holdingYears !== '') params.set('hy', holdingYears.toString());
    params.set('ih', inHouseRegOver1Year ? '1' : '0');
    params.set('hl', hasLoan ? '1' : '0');
    if (hasLoan && loanAmount) params.set('la', loanAmount.toString());
    params.set('ir', isRural ? '1' : '0');
    params.set('vm', viewMode);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [sellingPrice, appraisedValue, sellerType, holdingYears, inHouseRegOver1Year, hasLoan, loanAmount, isRural, viewMode]);

  const result = useMemo(() => {
    return calculateTransferCosts({
      sellingPrice: sellingPrice || 0,
      appraisedValue: appraisedValue || 0,
      sellerType,
      holdingYears: holdingYears || 0,
      inHouseRegOver1Year,
      hasLoan,
      loanAmount: loanAmount || 0,
      isRural,
    });
  }, [sellingPrice, appraisedValue, sellerType, holdingYears, inHouseRegOver1Year, hasLoan, loanAmount, isRural]);

  const toggleTooltip = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveTooltip(activeTooltip === id ? null : id);
  };

  const copyToClipboard = () => {
    const text = `สรุปค่าใช้จ่ายการโอนบ้าน-ที่ดิน
💰 ราคาซื้อขาย: ฿${formatNumber(Number(sellingPrice))}
📄 ราคาประเมิน: ฿${formatNumber(Number(appraisedValue))}

🧑🏻 ผู้ซื้อจ่าย: ฿${formatNumber(result.summary.buyerTotal)}
👨🏻‍💼 ผู้ขายจ่าย: ฿${formatNumber(result.summary.sellerTotal)}
✅ รวมทั้งหมด: ฿${formatNumber(result.summary.grandTotal)}

[คำนวณจากแอปค่าโอน]`;
    navigator.clipboard.writeText(text);
    alert('คัดลอกข้อความแล้ว');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('คัดลอกลิงก์แล้ว');
  };

  const shareToLine = () => {
    const text = `สรุปค่าโอนบ้าน\nผู้ซื้อจ่าย: ฿${formatNumber(result.summary.buyerTotal)}\nผู้ขายจ่าย: ฿${formatNumber(result.summary.sellerTotal)}\n\nดูรายละเอียด/แก้ไข: ${window.location.href}`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16 font-sans">
      {/* Header View Selector */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button 
            onClick={() => setViewMode('buyer')}
            className={`flex-1 py-2 px-1 text-sm sm:text-base rounded-md font-medium transition-colors ${viewMode === 'buyer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            ผมเป็นผู้ซื้อ
          </button>
          <button 
            onClick={() => setViewMode('seller')}
            className={`flex-1 py-2 px-1 text-sm sm:text-base rounded-md font-medium transition-colors ${viewMode === 'seller' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            ผมเป็นผู้ขาย
          </button>
          <button 
            onClick={() => setViewMode('both')}
            className={`flex-1 py-2 px-1 text-sm sm:text-base rounded-md font-medium transition-colors ${viewMode === 'both' ? 'bg-white border-2 border-blue-600 text-blue-700' : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'}`}
          >
            ดูทั้งสองฝ่าย
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">เครื่องคำนวณค่าโอนบ้าน-ที่ดิน</h1>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-6 mb-6">
          
          <div className="space-y-1">
            <div className="flex items-center">
              <label className="font-semibold text-gray-700">ราคาซื้อขาย (บาท)</label>
              <button className="ml-2 text-gray-400" onClick={(e) => toggleTooltip('sp', e)}><Info size={16}/></button>
            </div>
            {activeTooltip === 'sp' && (
              <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                ราคาตกลงซื้อขายจริง
              </div>
            )}
            <input 
              type="text" 
              inputMode="numeric"
              placeholder="เช่น 3,000,000"
              value={sellingPrice ? formatNumber(sellingPrice as number) : ''}
              onChange={(e) => {
                setSellingPrice(parseNumber(e.target.value));
                if (useSellingPriceAsAppraised) setUseSellingPriceAsAppraised(false);
              }}
              className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center">
              <label className="font-semibold text-gray-700">ราคาประเมินกรมที่ดิน (บาท)</label>
              <button className="ml-2 text-gray-400" onClick={(e) => toggleTooltip('av', e)}><Info size={16}/></button>
            </div>
            {activeTooltip === 'av' && (
              <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                ราคาที่รัฐกำหนด ไม่ใช่ราคาขาย — มักต่ำกว่าราคาขาย ตรวจสอบได้ที่เว็บกรมธนารักษ์ assessprice.treasury.go.th
              </div>
            )}
            <input 
              type="text" 
              inputMode="numeric"
              placeholder="ราคาประเมินราชการ"
              value={appraisedValue ? formatNumber(appraisedValue as number) : ''}
              onChange={(e) => setAppraisedValue(parseNumber(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            
            <div className="flex items-center justify-between pt-1">
              <button 
                onClick={() => {
                  if (sellingPrice) {
                    setAppraisedValue(sellingPrice);
                    setUseSellingPriceAsAppraised(true);
                  }
                }}
                className="text-sm text-blue-600 underline hover:text-blue-800"
              >
                ไม่รู้ราคาประเมิน — ใช้ราคาขายไปก่อน
              </button>
            </div>
            {useSellingPriceAsAppraised && (
              <div className="flex items-start bg-orange-50 text-orange-800 text-sm p-3 rounded mt-2 border border-orange-200">
                <AlertTriangle size={16} className="shrink-0 mr-2 mt-0.5 text-orange-500" />
                <p>ตัวเลขจะคลาดเคลื่อน เนื่องจากราคาประเมินมักจะต่ำกว่าราคาขาย ควรหาราคาประเมินจริงมาใส่เพื่อความแม่นยำ</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="font-semibold text-gray-700">ผู้ขายคือใคร</label>
                <button className="ml-2 text-gray-400" onClick={(e) => toggleTooltip('st', e)}><Info size={16}/></button>
              </div>
              {activeTooltip === 'st' && (
                <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 mb-2">
                  คำนวณภาษีหัก ณ ที่จ่ายต่างกัน บุคคลธรรมดาใช้ขั้นบันได / นิติบุคคลหัก 1%
                </div>
              )}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                  className={`flex-1 py-2 text-sm font-medium rounded-md ${sellerType === 'individual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                  onClick={() => setSellerType('individual')}
                >
                  บุคคลธรรมดา
                </button>
                <button 
                  className={`flex-1 py-2 text-sm font-medium rounded-md ${sellerType === 'corporate' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                  onClick={() => setSellerType('corporate')}
                >
                  นิติบุคคล
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center">
                <label className="font-semibold text-gray-700">จำนวนปีที่ถือครองมา</label>
                <button className="ml-2 text-gray-400" onClick={(e) => toggleTooltip('hy', e)}><Info size={16}/></button>
              </div>
              {activeTooltip === 'hy' && (
                <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                  นับตั้งแต่วันที่รับโอนมา เศษของปีนับเป็น 1 ปีเต็ม มีผลกับส่วนลดค่าใช้จ่ายการประเมินภาษี
                </div>
              )}
              <input 
                type="number" 
                placeholder="เช่น 3"
                value={holdingYears === '' ? '' : holdingYears}
                onChange={(e) => setHoldingYears(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-gray-700 flex items-center">
                    ผู้ขายมีชื่อในทะเบียนบ้านเกิน 1 ปี
                    <button className="ml-2 text-gray-400" onClick={(e) => toggleTooltip('ih', e)}><Info size={16}/></button>
                  </label>
                  {activeTooltip === 'ih' && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 mt-1">
                      ถ้ามีชื่อเกิน 1 ปี จะได้รับการยกเว้นภาษีธุรกิจเฉพาะ (SBT) เสียแค่อากรแสตมป์
                    </div>
                  )}
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1 w-32 shrink-0 ml-4">
                  <button 
                    className={`flex-1 py-1 text-sm font-medium rounded-md ${inHouseRegOver1Year ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setInHouseRegOver1Year(true)}
                  >
                    ใช่
                  </button>
                  <button 
                    className={`flex-1 py-1 text-sm font-medium rounded-md ${!inHouseRegOver1Year ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setInHouseRegOver1Year(false)}
                  >
                    ไม่ใช่
                  </button>
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-gray-700 flex items-center">
                    ผู้ซื้อกู้ธนาคารไหม
                    <button className="ml-2 text-gray-400" onClick={(e) => toggleTooltip('hl', e)}><Info size={16}/></button>
                  </label>
                  {activeTooltip === 'hl' && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 mt-1">
                      ถ้ากู้ธนาคาร จะมีค่าจดจำนองเพิ่มขึ้นมา (มีมาตรการลดหย่อนด้วย)
                    </div>
                  )}
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1 w-32 shrink-0 ml-4">
                  <button 
                    className={`flex-1 py-1 text-sm font-medium rounded-md ${hasLoan ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setHasLoan(true)}
                  >
                    กู้
                  </button>
                  <button 
                    className={`flex-1 py-1 text-sm font-medium rounded-md ${!hasLoan ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setHasLoan(false)}
                  >
                    ไม่กู้
                  </button>
                </div>
             </div>
             
             {hasLoan && (
               <div className="mt-3 pl-4 border-l-4 border-blue-200">
                  <label className="text-sm font-medium text-gray-600 block mb-1">วงเงินกู้ธนาคาร (บาท)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="ใส่จำนวนเงินกู้"
                    value={loanAmount ? formatNumber(loanAmount as number) : ''}
                    onChange={(e) => setLoanAmount(parseNumber(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                  />
               </div>
             )}
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
             <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-gray-700 flex items-center">
                    อยู่นอกเขตเทศบาล กทม. พัทยา
                    <button className="ml-2 text-gray-400" onClick={(e) => toggleTooltip('ir', e)}><Info size={16}/></button>
                  </label>
                  {activeTooltip === 'ir' && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 mt-1">
                      อสังหาฯ นอกเขต จะได้รับยกเว้นภาษีเงินได้ 200,000 บาทแรก สำหรับบุคคลธรรมดา
                    </div>
                  )}
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1 w-40 shrink-0 ml-4">
                  <button 
                    className={`flex-1 py-1 text-sm font-medium rounded-md ${!isRural ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setIsRural(false)}
                  >
                    ในเขต
                  </button>
                  <button 
                    className={`flex-1 py-1 text-sm font-medium rounded-md ${isRural ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setIsRural(true)}
                  >
                    นอกเขต
                  </button>
                </div>
             </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          
          {/* Measure Banner */}
          {sellingPrice > 0 && appraisedValue > 0 && (
            result.measureStatus.transferEligible ? (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start shadow-sm">
                <CheckCircle2 className="shrink-0 mr-3 mt-0.5 text-green-600" size={20} />
                <div>
                  <p className="font-semibold mt-0">เข้าเงื่อนไขมาตรการลดค่าธรรมเนียม 2569</p>
                  <p className="text-sm opacity-90 mt-0.5">เหลือเวลาอีก {result.measureStatus.daysLeft} วัน (ถึง 30 มิ.ย. 2569)</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-200 text-gray-600 px-4 py-3 rounded-lg text-sm">
                ไม่เข้าร่วมมาตรการ: ราคาเกิน 7 ล้านบาท หรือหมดเขตมาตรการ (ค่าธรรมเนียมจะใช้อัตราปกติ)
              </div>
            )
          )}

          {/* Cards */}
          <div className={`grid gap-4 ${viewMode === 'both' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            
            {(viewMode === 'buyer' || viewMode === 'both') && (
              <div className={`bg-blue-600 rounded-xl p-5 text-white shadow-md ${viewMode === 'buyer' ? 'pb-8 pt-8' : ''}`}>
                <h3 className="text-blue-100 font-medium mb-1">ผู้ซื้อจ่าย</h3>
                <div className={`font-bold ${viewMode === 'buyer' ? 'text-5xl' : 'text-3xl'}`}>
                  <span className="text-blue-200 text-xl font-normal mr-1">฿</span>
                  {formatNumber(result.summary.buyerTotal)}
                </div>
                {viewMode === 'both' && <div className="mt-2 text-xs text-blue-200">ค่าโอน + ค่าจดจำนอง</div>}
              </div>
            )}

            {(viewMode === 'seller' || viewMode === 'both') && (
              <div className={`bg-gray-800 rounded-xl p-5 text-white shadow-md ${viewMode === 'seller' ? 'pb-8 pt-8' : ''}`}>
                <h3 className="text-gray-300 font-medium mb-1">ผู้ขายจ่าย</h3>
                <div className={`font-bold ${viewMode === 'seller' ? 'text-5xl' : 'text-3xl'}`}>
                  <span className="text-gray-400 text-xl font-normal mr-1">฿</span>
                  {formatNumber(result.summary.sellerTotal)}
                </div>
                {viewMode === 'both' && <div className="mt-2 text-xs text-gray-400">ภาษี + อากร/ธุรกิจเฉพาะ</div>}
              </div>
            )}
            
          </div>

          {/* Savings Banner */}
          {result.summary.totalSavings > 0 && (
            <div className="bg-emerald-500 text-white text-center py-2 px-4 rounded-lg font-medium shadow-sm flex items-center justify-center">
              🎉 มาตรการนี้ช่วยประหยัดเงินให้ผู้ซื้อ {formatNumber(result.summary.totalSavings)} บาท
            </div>
          )}

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-800 bg-gray-50 flex justify-between">
              <span>รายละเอียดการคำนวณ</span>
              <span>รวม {formatNumber(result.summary.grandTotal)} ฿</span>
            </div>
            
            <div className="divide-y divide-gray-100">
              
              {/* Transfer Fee */}
              <div className="px-5 py-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-800 text-sm">ค่าธรรมเนียมการโอน <span className="text-xs text-gray-500 font-normal bg-gray-100 px-2 py-0.5 rounded ml-1">ผู้ซื้อ</span></p>
                </div>
                <div className="text-right">
                  {result.items.transferFee.measureApplied && (
                    <span className="block text-xs text-gray-400 line-through">฿{formatNumber(result.items.transferFee.normalAmount)}</span>
                  )}
                  <span className="font-semibold text-blue-700">฿{formatNumber(result.items.transferFee.amount)}</span>
                </div>
              </div>

              {/* Mortgage Fee */}
              <div className={`px-5 py-4 flex justify-between items-center ${!result.items.mortgageFee.applicable ? 'opacity-50 grayscale' : 'hover:bg-gray-50'}`}>
                <div>
                  <p className="font-medium text-gray-800 text-sm">ค่าจดจำนอง <span className="text-xs text-gray-500 font-normal bg-gray-100 px-2 py-0.5 rounded ml-1">ผู้ซื้อ</span></p>
                  {!result.items.mortgageFee.applicable && <p className="text-xs text-gray-500 mt-0.5">ไม่ต้องจ่าย (ไม่ได้กู้)</p>}
                </div>
                <div className="text-right">
                  {result.items.mortgageFee.applicable ? (
                    <>
                      {result.items.mortgageFee.measureApplied && (
                        <span className="block text-xs text-gray-400 line-through">฿{formatNumber(result.items.mortgageFee.normalAmount)}</span>
                      )}
                      <span className="font-semibold text-blue-700">฿{formatNumber(result.items.mortgageFee.amount)}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-gray-500">-</span>
                  )}
                </div>
              </div>

              {/* SBT */}
              <div className={`px-5 py-4 flex justify-between items-center ${!result.items.specificBusinessTax.applicable ? 'opacity-50 grayscale' : 'hover:bg-gray-50'}`}>
                <div>
                  <p className="font-medium text-gray-800 text-sm">ภาษีธุรกิจเฉพาะ <span className="text-xs text-gray-500 font-normal bg-gray-100 px-2 py-0.5 rounded ml-1">ผู้ขาย</span></p>
                  {!result.items.specificBusinessTax.applicable && <p className="text-xs text-gray-500 mt-0.5">ไม่ต้องจ่าย (เสียอากรแสตมป์แทน)</p>}
                </div>
                <div className="text-right">
                   {result.items.specificBusinessTax.applicable ? (
                     <span className="font-semibold text-gray-700">฿{formatNumber(result.items.specificBusinessTax.amount)}</span>
                   ) : (
                     <span className="font-semibold text-gray-500">-</span>
                   )}
                </div>
              </div>

              {/* Stamp Duty */}
              <div className={`px-5 py-4 flex justify-between items-center ${!result.items.stampDuty.applicable ? 'opacity-50 grayscale' : 'hover:bg-gray-50'}`}>
                <div>
                  <p className="font-medium text-gray-800 text-sm">อากรแสตมป์ <span className="text-xs text-gray-500 font-normal bg-gray-100 px-2 py-0.5 rounded ml-1">ผู้ขาย</span></p>
                  {!result.items.stampDuty.applicable && <p className="text-xs text-gray-500 mt-0.5">ไม่ต้องจ่าย (เสียภาษีธุรกิจเฉพาะแทน)</p>}
                </div>
                <div className="text-right">
                   {result.items.stampDuty.applicable ? (
                     <span className="font-semibold text-gray-700">฿{formatNumber(result.items.stampDuty.amount)}</span>
                   ) : (
                     <span className="font-semibold text-gray-500">-</span>
                   )}
                </div>
              </div>

              {/* Income Tax */}
              <div className="px-5 py-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-800 text-sm">ภาษีเงินได้หัก ณ ที่จ่าย <span className="text-xs text-gray-500 font-normal bg-gray-100 px-2 py-0.5 rounded ml-1">ผู้ขาย</span></p>
                  {result.items.incomeWHT.detail?.capApplied && (
                     <p className="text-xs text-orange-600 mt-0.5">เงินได้ทะลุเพดาน ใช้เกณฑ์สูงสุด 20% ของราคาประเมิน</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-700">฿{formatNumber(result.items.incomeWHT.amount)}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <button 
              onClick={copyToClipboard}
              className="flex items-center justify-center p-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              <Copy size={18} className="mr-2 text-gray-500" />
              ก๊อปสรุปเป็นข้อความ
            </button>
            <button 
              onClick={shareToLine}
              className="flex items-center justify-center p-3 rounded-lg border border-[#06C755] bg-[#06C755] hover:bg-[#05b34c] text-white font-medium transition-colors"
            >
              <MessageCircle size={18} className="mr-2" />
              แชร์ผ่าน LINE
            </button>
            <button 
              onClick={copyLink}
              className="flex items-center justify-center p-3 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
            >
              <LinkIcon size={18} className="mr-2" />
              ก๊อปลิงก์
            </button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-8 mb-4">
            ตัวเลขนี้เป็นการประมาณการเบื้องต้น อ้างอิงอัตราและมาตรการปี 2569 
            <br />ยอดจริง ณ สำนักงานที่ดินอาจต่างเล็กน้อย แนะนำยืนยันกับสำนักงานที่ดินก่อนทำธุรกรรม
          </p>

        </div>
      </div>
    </div>
  );
}
