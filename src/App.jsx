import React, { useState } from 'react';

// --- Icons ---
const IconPrinter = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
);
const IconQrCode = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><path d="M3 14h7v7H3z"></path></svg>
);
const IconType = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
);
const IconFileText = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const IconExternalLink = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);

export default function App() {
    const [itemCode, setItemCode] = useState('PART-12345-X');
    const [itemName, setItemName] = useState('รายละเอียดสินค้า (Item Name)');
    
    // Auto-generate QR code based on itemCode
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(itemCode)}`;

    const handlePrint = () => {
        // Instead of opening a new window which might get blocked,
        // we use native window.print() combined with @media print CSS below
        window.print();
    };

    return (
        <div className="flex flex-col font-sans min-h-screen bg-gray-100">
            {/* Global Styles & Print Media Queries */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
                
                .font-sarabun { font-family: 'Sarabun', sans-serif; }
                .b-thick { border: 3px solid black; }
                .b-right { border-right: 3px solid black; }
                .b-bottom { border-bottom: 3px solid black; }
                .b-top { border-top: 3px solid black; }
                .rev-table { width: 100%; border-collapse: collapse; height: 100%; }
                .rev-table th, .rev-table td { border: 2px solid black; padding: 8px; text-align: center; }
                .rev-table th { background-color: #f3f4f6; font-weight: 800; text-transform: uppercase; }
                
                /* --- Print Setup --- */
                @media print {
                    @page { 
                        size: A4 landscape; 
                        margin: 0; 
                    }
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: white !important;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    /* Prevent scrolling areas from cropping the print */
                    main, .flex-1, #root, body {
                        overflow: visible !important;
                        display: block !important;
                        height: auto !important;
                    }
                    /* Force the printable content to fill the page exactly */
                    #printable-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        margin: 0;
                        box-shadow: none !important;
                        width: 297mm !important;
                        height: 210mm !important;
                        border: none !important;
                        background: white !important;
                    }
                }
            `}</style>

            {/* Navbar */}
            <nav className="bg-gray-900 text-white p-4 shadow-md no-print flex justify-between items-center z-50 relative">
                <div className="flex items-center gap-2">
                    <IconQrCode />
                    <h1 className="text-xl font-bold">Pallet Tag Generator</h1>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handlePrint}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer active:scale-95 border border-green-700"
                    >
                        <IconPrinter />
                        <span>สั่งพิมพ์ / Save PDF</span>
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-0" style={{height: 'calc(100vh - 64px)'}}>
                {/* Sidebar - Data Entry */}
                <aside className="w-full md:w-80 bg-white shadow-xl z-10 overflow-y-auto border-r border-gray-200 no-print">
                    <div className="p-6 space-y-8">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">ข้อมูลสำหรับพิมพ์</h2>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">1. ITEM CODE (สร้าง QR)</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3 text-gray-400"><IconType /></div>
                                    <input 
                                        type="text" 
                                        value={itemCode}
                                        onChange={(e) => setItemCode(e.target.value)}
                                        className="w-full border-2 border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none font-bold text-lg"
                                        placeholder="ระบุรหัสสินค้า"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">2. Item Name (ชื่อสินค้า)</label>
                                <div className="relative flex items-start">
                                    <div className="absolute left-3 top-3 text-gray-400"><IconFileText /></div>
                                    <textarea 
                                        value={itemName}
                                        onChange={(e) => setItemName(e.target.value)}
                                        rows={3}
                                        className="w-full border-2 border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:border-blue-500 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="ระบุชื่อสินค้า"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-sm text-blue-800 flex items-start gap-2">
                            <div className="mt-1"><IconExternalLink /></div>
                            <div>
                                <strong>คำแนะนำ:</strong> <br/>
                                กดปุ่ม "สั่งพิมพ์" ด้านบนขวา ระบบจะจัดหน้าแบบ A4 แนวนอน (Landscape) ให้อัตโนมัติ สามารถ Save เป็น PDF ได้เลย
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Preview Area */}
                <main className="flex-1 bg-gray-500 p-8 overflow-auto flex justify-center items-start">
                    
                    {/* The TAG Container */}
                    <div 
                        id="printable-content"
                        className="bg-white shadow-2xl font-sarabun" 
                        style={{ width: '297mm', height: '210mm', minWidth: '297mm', minHeight: '210mm', position: 'relative' }}
                    >
                        <div className="w-full h-full p-8 flex flex-col box-border">
                            <div className="flex-1 border-[4px] border-black flex flex-col p-1 relative">
                                
                                {/* ROW 1: ITEM INFO + QR (Height 45%) */}
                                <div className="flex b-bottom h-[45%]">
                                    <div className="w-[25%] b-right p-2 flex flex-col items-center justify-center">
                                        <img 
                                            src={qrCodeUrl} 
                                            alt="QR Code" 
                                            className="w-full h-auto object-contain max-h-[90%]"
                                        />
                                    </div>
                                    <div className="w-[75%] flex flex-col overflow-hidden">
                                        <div className="h-1/2 b-bottom p-4 relative flex flex-col justify-center overflow-hidden">
                                            <div className="absolute top-2 left-3 text-sm font-bold uppercase text-gray-500 tracking-wider">ITEM CODE</div>
                                            <div className="text-[75px] leading-none font-bold text-black tracking-tight overflow-hidden whitespace-nowrap mt-4 pl-4 truncate">
                                                {itemCode || '-'}
                                            </div>
                                        </div>
                                        <div className="h-1/2 p-4 relative flex items-center overflow-hidden">
                                            <div className="absolute top-2 left-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Item Name</div>
                                            <div className="text-4xl font-bold leading-tight line-clamp-3 w-full pl-4 pt-2">
                                                {itemName || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ROW 2: LOT & LOCATOR (Expanded Height to 35%) */}
                                <div className="flex b-bottom h-[35%]">
                                    <div className="w-1/2 b-right p-4 relative flex flex-col justify-between">
                                        <div className="text-xl font-bold uppercase text-gray-600">LOT#</div>
                                        <div className="flex items-end justify-center pb-2">
                                            {/* Static Demo Data as per original code */}
                                        </div>
                                    </div>
                                    <div className="w-1/2 p-4 relative flex flex-col justify-between">
                                        <div className="text-xl font-bold uppercase text-gray-600">LOCATOR#</div>
                                        <div className="flex items-end justify-center pb-2">
                                            <span className="text-4xl font-bold mr-6">PIA -</span>
                                            <div className="flex-1"></div>
                                            <span className="text-4xl font-bold ml-6">224-G</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ROW 3: REV TABLE (Remaining Height) */}
                                <div className="flex flex-1">
                                    <div className="w-full p-4 flex flex-col">
                                        <table className="rev-table">
                                            <thead>
                                                <tr>
                                                    <th className="w-[20%] text-xl">REV#</th>
                                                    <th className="w-[20%] text-xl">QTY.</th>
                                                    <th className="w-[20%] text-xl">DATE</th>
                                                    <th className="w-[40%] text-xl">NOTE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[0, 1].map((rev) => (
                                                    <tr key={rev}>
                                                        <td className="font-bold text-left pl-6 text-xl">Rev# {rev}</td>
                                                        <td></td>
                                                        <td></td>
                                                        <td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}