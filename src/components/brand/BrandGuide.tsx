import React, { useState } from 'react';
import { Logo } from '../common/Logo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Chip } from '../ui/Chip';
import { Input, SearchInput, Select, Stepper, RadioGroup } from '../ui/Input';
import { Dialog } from '../ui/Dialog';
import { BottomSheet } from '../ui/BottomSheet';
import { useToast } from '../ui/Toast';
import { ProductCardSkeleton, CategorySkeleton, FormSkeleton, OrderSummarySkeleton } from '../ui/Skeleton';
import { BRAND_COLORS, BRAND_TYPOGRAPHY, BRAND_SPACING, BRAND_RADIUS, BRAND_ELEVATION } from '../../theme/tokens';
import {
  Sparkles,
  Palette,
  Type,
  Maximize2,
  Box,
  Layers,
  Zap,
  Sliders,
  CheckCircle2,
  Star,
  ShoppingBag,
  Bell,
  SlidersHorizontal,
  Copy,
  Check,
  Eye,
  Info
} from 'lucide-react';

export const BrandGuide: React.FC = () => {
  const { showToast } = useToast();
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [selectedChip, setSelectedChip] = useState('all');
  const [stepperVal, setStepperVal] = useState(3);
  const [radioVal, setRadioVal] = useState('box1');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'colors' | 'typography' | 'tokens' | 'components' | 'glass'>('all');

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    showToast(`تم نسخ كود اللون ${hex}`, 'تم حفظ الكود في الحافظة بنجاح', 'success');
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const colorGroups = [
    {
      titleAr: 'ألوان الكاكاو والإسبريسو (Cacao & Espresso - Base Theme)',
      subtitleAr: 'مستخرجة من الإطار الداكن الملتف واللون الخشبي الداكن للشعار',
      swatches: [
        { name: 'Cacao 1000', hex: BRAND_COLORS.cacao[1000], usage: 'خلفية سوداء أوبسيديان عميقة جداً' },
        { name: 'Cacao 900', hex: BRAND_COLORS.cacao[900], usage: 'خلفية الصفحة الرئيسية Dark Canvas' },
        { name: 'Cacao 800', hex: BRAND_COLORS.cacao[800], usage: 'أسطح البطاقات والحاويات' },
        { name: 'Cacao 700', hex: BRAND_COLORS.cacao[700], usage: 'بطاقة التفاعل والتنقّل' },
        { name: 'Cacao 500 (Logo Ring)', hex: BRAND_COLORS.cacao[500], usage: 'لون إطار الشعار الخارجي الإسبريسو' },
        { name: 'Cacao 400', hex: BRAND_COLORS.cacao[400], usage: 'الحدود الدافئة وحواف البطاقات' },
      ],
    },
    {
      titleAr: 'الذهب الإمبراطوري والكتابة الملكية (Imperial Gold & Champagne)',
      subtitleAr: 'مستخرجة من النجوم الثلاثة، شريط الذهب، وخلفية الكلمات',
      swatches: [
        { name: 'Gold Champagne', hex: BRAND_COLORS.gold.light, usage: 'النصوص البارزة وشهب الإضاءة' },
        { name: 'Gold Cream', hex: BRAND_COLORS.gold.cream, usage: 'العناوين الفاخرة والنصوص الملكية' },
        { name: 'Sacred Gold (Primary)', hex: BRAND_COLORS.gold.primary, usage: 'الأزرار الرئيسية والحدود النشطة' },
        { name: 'Medium Gold', hex: BRAND_COLORS.gold.medium, usage: 'التدرجات الذهبية العميقة' },
        { name: 'Dark Gold', hex: BRAND_COLORS.gold.dark, usage: 'ألوان الظلال والزخارف' },
      ],
    },
    {
      titleAr: 'أوراق الزيتون والفستق (Pistachio & Olive Leaf)',
      subtitleAr: 'مستخرجة من شجرة الزيتون المباركة في منتصف اللوجو',
      swatches: [
        { name: 'Pistachio Light', hex: BRAND_COLORS.pistachio.light, usage: 'قمم أوراق الشجر والإضاءات' },
        { name: 'Olive Pistachio Primary', hex: BRAND_COLORS.pistachio.medium, usage: 'شارة المأكولات الطازجة والضمان' },
        { name: 'Leaf Shadow Green', hex: BRAND_COLORS.pistachio.dark, usage: 'خلفيات شارات الحالة الإيجابية' },
      ],
    },
    {
      titleAr: 'الرق والمخطوطات العتيقة (Parchment & Cream)',
      subtitleAr: 'مستخرجة من القرص الداخلي للشعار والمخطوطات العربية',
      swatches: [
        { name: 'Cream Parchment Pure', hex: BRAND_COLORS.parchment.pure, usage: 'النصوص الكريستالية الناصعة' },
        { name: 'Warm Parchment Light', hex: BRAND_COLORS.parchment.light, usage: 'النصوص العادية وقراءة المكونات' },
        { name: 'Muted Parchment Neutral', hex: BRAND_COLORS.parchment.dark, usage: 'النصوص الفرعية والتفاصيل' },
        { name: 'Dark Muted Neutral', hex: BRAND_COLORS.parchment.muted, usage: 'الملاحظات الخافتة والأوصاف' },
      ],
    },
  ];

  return (
    <div className="space-y-12 dir-rtl text-right">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#23170F] via-[#160E0A] to-[#23170F] p-8 sm:p-12 border border-[#D4AF37]/50 shadow-2xl overflow-hidden gold-glow-sm">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gold-gradient animate-shimmer" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-bold text-[#F4E08B]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>دليل هوية العلامة التجارية الرسمي • مواصفات تصميم الهوية</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-gold-gradient font-heading tracking-tight leading-tight">
              نظام الهوية البصرية الفاخرة - حلواني بامبورينا
            </h1>

            <p className="text-sm sm:text-base text-[#C8BFB0] leading-relaxed">
              دليل شامل ومُتكامل لهوية الماركة واستخراج الألوان الرسمية من اللوجو المقدّس، الأنماط الطبوغرافية العربية،
              أنظمة الظلال والزجاج (Glassmorphism)، ومكتبة العناصر التفاعلية الداكنة الملكية RTL.
            </p>

            {/* Category Filter Pills */}
            <div className="pt-2 flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'كافة الأقسام' },
                { id: 'colors', label: 'لوحة الألوان' },
                { id: 'typography', label: 'الخطوط العربية' },
                { id: 'tokens', label: 'الأبعاد والظلال' },
                { id: 'components', label: 'مكتبة الواجهات (UI Kit)' },
                { id: 'glass', label: 'المؤثرات والزجاج' },
              ].map((tab) => (
                <Chip
                  key={tab.id}
                  label={tab.label}
                  active={activeSection === tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  size="sm"
                />
              ))}
            </div>
          </div>

          {/* Logo Showcase Widget */}
          <div className="bg-[#0B0806] border border-[#3D2C1E] p-6 rounded-3xl flex flex-col items-center justify-center gap-3 shrink-0 gold-glow-sm">
            <Logo size="lg" showArabicText={true} showSubtitle={true} />
            <div className="text-[11px] font-bold text-[#D4AF37] tracking-wider">
              شعار بامبورينا الأصيل
            </div>
          </div>
        </div>
      </div>

      {/* 1. SACRED LOGO ANATOMY */}
      {(activeSection === 'all' || activeSection === 'tokens') && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#2C1F16] pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#221811] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Star className="w-5 h-5 fill-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#FFF1C5] font-heading">
                1. تشريح الشعار الرسمي
              </h2>
              <p className="text-xs text-[#C8BFB0]">
                الشعار هو النواة المركزية لكافة عناصر الهوية البصرية للعلامة التجارية
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3 bg-[#140E0A] border-[#3D2C1E]">
              <div className="text-xs font-bold text-[#D4AF37]">
                01. الإطار الخارجي والخطوط
              </div>
              <h3 className="text-lg font-bold text-[#F7F3E8]">الإطار الداكني الدائري</h3>
              <p className="text-xs text-[#C8BFB0] leading-relaxed">
                حلقة دائرية باللون البني الخشبي والإسبريسو (#2E1A0D) تحتوي على عبارة الماركة المكررة{' '}
                <span className="text-[#F4E08B] font-bold">بامبورينا حلواني ***</span> المطبوعة باللون العاجي.
              </p>
            </Card>

            <Card className="p-6 space-y-3 bg-[#140E0A] border-[#3D2C1E]">
              <div className="text-xs font-bold text-[#D4AF37]">
                02. شجرة المركز والخط
              </div>
              <h3 className="text-lg font-bold text-[#F7F3E8]">شجرة الزيتون والخط الإيطالي</h3>
              <p className="text-xs text-[#C8BFB0] leading-relaxed">
                شجرة الزيتون المباركة بدرجات الأخضر الفستقي (#6B8E59) تعلو اسم الماركة المنقوش{' '}
                <span className="text-[#F4E08B] font-bold">بامبورينا</span> مع خط الذهب الملكي.
              </p>
            </Card>

            <Card className="p-6 space-y-3 bg-[#140E0A] border-[#3D2C1E]">
              <div className="text-xs font-bold text-[#D4AF37]">
                03. النجوم الثلاثة والمخطوطة
              </div>
              <h3 className="text-lg font-bold text-[#F7F3E8]">النجوم الثلاثة والمخطوطة العربية</h3>
              <p className="text-xs text-[#C8BFB0] leading-relaxed">
                3 نجوم بنية ترمز للدرجة الممتازة وتتوج خط المخطوطة العربية الأصيل{' '}
                <span className="text-[#F4E08B] font-bold">حلواني بامبورينا</span>.
              </p>
            </Card>
          </div>
        </section>
      )}

      {/* 2. BRAND COLOR PALETTES EXTRACTED FROM LOGO */}
      {(activeSection === 'all' || activeSection === 'colors') && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#2C1F16] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#221811] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#FFF1C5] font-heading">
                  2. لوحة الألوان الرسمية
                </h2>
                <p className="text-xs text-[#C8BFB0]">
                  كافة الدرجات مستخرجة بدقة متناهية من الشعار الرسمي وتدعم الوضع الداكن الملكي
                </p>
              </div>
            </div>
            <Badge variant="gold">لوحة الألوان الملكية الداكنة</Badge>
          </div>

          <div className="space-y-8">
            {colorGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#F4E08B] font-heading">{group.titleAr}</h3>
                  <p className="text-xs text-[#8E8373]">{group.subtitleAr}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {group.swatches.map((swatch, sIdx) => (
                    <div
                      key={sIdx}
                      onClick={() => handleCopy(swatch.hex)}
                      className="group relative bg-[#140E0A] border border-[#2D2017] hover:border-[#D4AF37] rounded-2xl p-3 space-y-2 cursor-pointer transition-all duration-200 hover:-translate-y-1"
                    >
                      <div
                        className="h-16 w-full rounded-xl border border-white/10 shadow-inner flex items-center justify-center relative overflow-hidden"
                        style={{ backgroundColor: swatch.hex }}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-mono flex items-center gap-1">
                          {copiedHex === swatch.hex ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> تم النسخ
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> نسخ
                            </>
                          )}
                        </span>
                      </div>

                      <div className="space-y-0.5 dir-ltr text-right">
                        <div className="text-xs font-bold text-[#F7F3E8] truncate dir-rtl">{swatch.name}</div>
                        <div className="text-[11px] font-mono text-[#D4AF37]">{swatch.hex}</div>
                        <div className="text-[10px] text-[#8E8373] dir-rtl line-clamp-1">{swatch.usage}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. TYPOGRAPHY SYSTEM */}
      {(activeSection === 'all' || activeSection === 'typography') && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#2C1F16] pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#221811] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#FFF1C5] font-heading">
                3. نظام الخطوط العربية الملكية
              </h2>
              <p className="text-xs text-[#C8BFB0]">
                اعتماد الخطوط العربية للواجهات مع تنسيق الأسعار بالجنيه المصري
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
              <h3 className="text-sm font-bold text-[#D4AF37]">
                العناوين والخطوط الرئيسية
              </h3>

              <div className="space-y-4 border-t border-[#2C1F16] pt-4">
                <div className="space-y-1">
                  <div className="text-[10px] text-[#8E8373]">عنوان رئيسي كبير</div>
                  <h1 className="text-3xl font-black text-gold-gradient font-heading">
                    حلواني بامبورينا - أصالة وفخامة
                  </h1>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-[#8E8373]">عنوان فرعي كبير</div>
                  <h2 className="text-2xl font-extrabold text-[#FFF1C5] font-heading">
                    كنافة نابلسية بالجبن العكاوي الملكي
                  </h2>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-[#8E8373]">عنوان قسم</div>
                  <h3 className="text-xl font-bold text-[#F7F3E8] font-heading">
                    حلويات شرقية مجهزة يدوياً بأجود أنواع السمن البلدي
                  </h3>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-[#8E8373]">عنوان صنف</div>
                  <h4 className="text-base font-bold text-[#F4E08B]">
                    تفاصيل الصنف والمكونات الفرعية
                  </h4>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
              <h3 className="text-sm font-bold text-[#D4AF37]">
                تنسيق الأسعار والعملة المصرية
              </h3>

              <div className="space-y-4 border-t border-[#2C1F16] pt-4">
                <div className="p-4 rounded-2xl bg-[#1C140E] border border-[#3D2C1E] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#8E8373] block">سعر العبوة الملكية</span>
                    <span className="text-2xl font-black text-gold-gradient font-mono">
                      450.00 ج.م
                    </span>
                  </div>
                  <Badge variant="bestseller">خصم 15%</Badge>
                </div>

                <div className="p-4 rounded-2xl bg-[#1C140E] border border-[#3D2C1E] space-y-2">
                  <div className="text-xs text-[#8E8373]">قواعد كتابة النصوص والأوصاف</div>
                  <p className="text-xs text-[#C8BFB0] leading-relaxed">
                    تُصنع حلويات بامبورينا يومياً بأيدي أمهر طهاة الحلويات الشرقية والغربية، باستخدام السمن البلدي الصافي
                    الفستق الحلبي الفاخر، والشوكولاتة البلجيكية الغنية.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* 4. SPACING, RADIUS, SHADOW, AND ELEVATION */}
      {(activeSection === 'all' || activeSection === 'tokens') && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#2C1F16] pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#221811] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#FFF1C5] font-heading">
                4. شبكة الأبعاد والظلال والحواف
              </h2>
              <p className="text-xs text-[#C8BFB0]">
                أنظمة الحواف المنحنية ومستويات الارتفاع والوهج الذهبي
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radius Grid */}
            <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
              <h3 className="text-sm font-bold text-[#D4AF37]">نظام انحناء الحواف</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#1C140E] border border-[#3D2C1E] rounded-md text-center">
                  <div className="text-xs text-[#F7F3E8] font-bold">صغير جداً</div>
                  <div className="text-[10px] text-[#8E8373]">وسوم صغيرة</div>
                </div>
                <div className="p-3 bg-[#1C140E] border border-[#3D2C1E] rounded-lg text-center">
                  <div className="text-xs text-[#F7F3E8] font-bold">صغير</div>
                  <div className="text-[10px] text-[#8E8373]">أزرار صغرى</div>
                </div>
                <div className="p-3 bg-[#1C140E] border border-[#3D2C1E] rounded-xl text-center">
                  <div className="text-xs text-[#F7F3E8] font-bold">متوسط</div>
                  <div className="text-[10px] text-[#8E8373]">حقول الإدخال</div>
                </div>
                <div className="p-3 bg-[#1C140E] border border-[#3D2C1E] rounded-2xl text-center">
                  <div className="text-xs text-[#F7F3E8] font-bold">كبير</div>
                  <div className="text-[10px] text-[#8E8373]">بطاقات الأصناف</div>
                </div>
                <div className="p-3 bg-[#1C140E] border border-[#3D2C1E] rounded-3xl text-center col-span-2">
                  <div className="text-xs text-[#F7F3E8] font-bold">كبير جداً</div>
                  <div className="text-[10px] text-[#8E8373]">الحاويات الكبرى والنوافذ المنبثقة</div>
                </div>
              </div>
            </Card>

            {/* Shadows & Elevation */}
            <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
              <h3 className="text-sm font-bold text-[#D4AF37]">الظلال والوهج الروحي</h3>
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#1C140E] border border-[#3D2C1E] shadow-sm flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F7F3E8]">ظل خفيف</span>
                  <span className="text-[10px] text-[#8E8373]">بطاقات قائمة الطعام</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#1C140E] border border-[#D4AF37]/30 gold-glow-sm flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F4E08B]">وهج ذهبي ناعم</span>
                  <span className="text-[10px] text-[#8E8373]">الصنف المحدد / السلة</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#261B13] border border-[#D4AF37] gold-glow flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FFF1C5]">وهج ذهبي قاطِع</span>
                  <span className="text-[10px] text-[#F4E08B]">أزرار الشراء الفاخرة</span>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* 5. GLASS EFFECTS & BLUR SYSTEM */}
      {(activeSection === 'all' || activeSection === 'glass') && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#2C1F16] pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#221811] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#FFF1C5] font-heading">
                5. تأثيرات الزجاج والشفافية
              </h2>
              <p className="text-xs text-[#C8BFB0]">
                تطبيق ضبابية خلفية الكاكاو والذهب مع حدود متوهجة
              </p>
            </div>
          </div>

          <div className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-br from-[#3A2213] via-[#140E0A] to-[#2E1A0D] border border-[#D4AF37]/30 flex flex-col sm:flex-row gap-6">
            <div className="bg-gold-glass p-6 rounded-2xl border border-[#D4AF37]/30 space-y-2 flex-1">
              <div className="text-xs font-bold text-[#D4AF37]">بطاقة زجاجية</div>
              <h4 className="text-base font-bold text-white">بطاقة الزجاج الذهبي الملكي</h4>
              <p className="text-xs text-[#C8BFB0] leading-relaxed">
                تُستخدم في الهيدر العلوي، أشرطة السلة العائمة، والقوائم المنبثقة لمنح انطباع فندقي فاخر.
              </p>
            </div>

            <div className="bg-[#100B08]/80 backdrop-blur-2xl p-6 rounded-2xl border border-[#3D2C1E] space-y-2 flex-1">
              <div className="text-xs font-bold text-[#F4E08B]">ضببابية الكاكاو</div>
              <h4 className="text-base font-bold text-white">زجاج الكاكاو الداكن</h4>
              <p className="text-xs text-[#C8BFB0] leading-relaxed">
                تُستخدم في القاع السفلي للهواتف الذكية لمنع التشتت البصري.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 6. COMPLETE UI COMPONENT KIT SHOWCASE */}
      {(activeSection === 'all' || activeSection === 'components') && (
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-[#2C1F16] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#221811] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#FFF1C5] font-heading">
                  6. مكتبة المكونات التفاعلية
                </h2>
                <p className="text-xs text-[#C8BFB0]">
                  أزرار، حقول إدخال، شارات، خيارات، أجهزة تنبيه، ونوافذ منبثقة تفاعلية
                </p>
              </div>
            </div>
            <Badge variant="signature">واجهة عربية</Badge>
          </div>

          {/* A. BUTTONS SHOWCASE */}
          <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
            <h3 className="text-base font-bold text-[#F4E08B] font-heading flex items-center gap-2">
              <span>أ. نظام الأزرار</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="gold" leftIcon={<ShoppingBag className="w-4 h-4" />}>
                زر ذهبي إمبراطوري
              </Button>

              <Button variant="gold-outline" rightIcon={<Sparkles className="w-4 h-4" />}>
                زر مفرّغ ذهبي
              </Button>

              <Button variant="dark-glass">
                زر زجاجي داكن
              </Button>

              <Button variant="ghost">
                زر شفاف
              </Button>

              <Button variant="danger">
                زر إلغاء / حذف
              </Button>

              <Button variant="gold" size="sm">
                زر صغير sm
              </Button>
            </div>
          </Card>

          {/* B. FORMS & INPUT CONTROLS */}
          <Card className="p-6 space-y-6 bg-[#140E0A] border-[#3D2C1E]">
            <h3 className="text-base font-bold text-[#F4E08B] font-heading">
              ب. حقول الإدخال والخيارات (Forms & Controls)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input
                label="الاسم بالكامل"
                placeholder="أدخل اسمك الكريم..."
                floatingLabel
              />

              <Input
                label="رقم الهاتف"
                placeholder="01012345678"
                type="tel"
                floatingLabel
              />

              <Input
                label="كلمة المرور"
                type="password"
                placeholder="••••••••"
                floatingLabel
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SearchInput placeholder="ابحث عن كنافة، بسبوسة، تورتة..." />

              <Select
                label="اختر فرع التوصيل"
                options={[
                  { value: 'cairo-nasr', label: 'فرع مدينة نصر - القليوبية' },
                  { value: 'alex-smouha', label: 'فرع سموحة - الإسكندرية' },
                  { value: 'cairo-tagamoa', label: 'فرع التجمع الخامس - القاهرة' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#C8BFB0] block">عداد الكميات</span>
                <Stepper value={stepperVal} onChange={setStepperVal} size="md" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#C8BFB0] block">مجموعة الاختيارات</span>
                <RadioGroup
                  name="boxSelection"
                  selectedValue={radioVal}
                  onChange={setRadioVal}
                  options={[
                    { value: 'box1', titleAr: 'علبة مشكل ملَكي (1 كجم)', priceExtraAr: '280 ج.م', badgeAr: 'الأكثر طَلَبَاً' },
                    { value: 'box2', titleAr: 'علبة مشكل فاخرة (2 كجم)', priceExtraAr: '540 ج.م' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* C. BADGES & CHIPS */}
          <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
            <h3 className="text-base font-bold text-[#F4E08B] font-heading">
              ج. الشارات والأوسمة
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">ذهبي إمبراطوري</Badge>
              <Badge variant="bestseller">الأكثر طَلَبَاً</Badge>
              <Badge variant="signature">توقيع بامبورينا</Badge>
              <Badge variant="chef">اختيار الشيف</Badge>
              <Badge variant="discount">خصم 20%</Badge>
              <Badge variant="new">جديد الموسم</Badge>
              <Badge variant="dark">داكن محايد</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2C1F16]">
              {['all', 'oriental', 'western', 'bakery', 'ramadan'].map((chipId) => (
                <Chip
                  key={chipId}
                  label={
                    chipId === 'all'
                      ? 'الكل'
                      : chipId === 'oriental'
                      ? 'حلويات شرقية'
                      : chipId === 'western'
                      ? 'حلويات غربية'
                      : chipId === 'bakery'
                      ? 'مخبوزات وساليزون'
                      : 'موسم رمضان'
                  }
                  count={chipId === 'oriental' ? 14 : 8}
                  active={selectedChip === chipId}
                  onClick={() => setSelectedChip(chipId)}
                />
              ))}
            </div>
          </Card>

          {/* D. INTERACTIVE TOASTS & MODALS TESTERS */}
          <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
            <h3 className="text-base font-bold text-[#F4E08B] font-heading">
              د. النوافذ المنبثقة والشاشات التفاعلية
            </h3>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="gold"
                onClick={() => setIsDialogOpen(true)}
                leftIcon={<Maximize2 className="w-4 h-4" />}
              >
                تحديث نافذة المنبثقة
              </Button>

              <Button
                variant="dark-glass"
                onClick={() => setIsSheetOpen(true)}
                leftIcon={<SlidersHorizontal className="w-4 h-4" />}
              >
                فتح القائمة السفلى
              </Button>

              <Button
                variant="gold-outline"
                onClick={() => showToast('تمت إضافة المنتج بنجاح', 'تم تحديث سلة التسوق الخاصة بك', 'success')}
                leftIcon={<Bell className="w-4 h-4" />}
              >
                اختبار تنبيه (نجاح)
              </Button>

              <Button
                variant="danger"
                onClick={() => showToast('تنبيه في التوصيل', 'عذراً الصنف غير متوفر حالياً في هذا الفرع', 'error')}
              >
                اختبار تنبيه (خطأ)
              </Button>
            </div>
          </Card>

          {/* E. LOADING SKELETONS */}
          <Card className="p-6 space-y-4 bg-[#140E0A] border-[#3D2C1E]">
            <h3 className="text-base font-bold text-[#F4E08B] font-heading">
              هـ. هيكليات التحميل
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProductCardSkeleton />
              <CategorySkeleton />
              <OrderSummarySkeleton />
              <FormSkeleton />
            </div>
          </Card>
        </section>
      )}

      {/* DIALOG MODAL DEMO */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="تخصيص طلب الحلويات الفاخرة"
        subtitle="اختر المكونات والتغليف الملكي الخاص بك"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="gold"
              onClick={() => {
                setIsDialogOpen(false);
                showToast('تم حفظ التخصيص بنجاح', 'سيتم إعداد العلبة بنفس المواصفات', 'success');
              }}
            >
              تأكيد الاختيارات
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="اسم صاحب الطلب / الإهداء" placeholder="اكتب الاسم المنقوش على العلبة..." floatingLabel />
          <Select
            label="نوع التغليف الملكي"
            options={[
              { value: 'gold-ribbon', label: 'علبة مذهبة مع شريط ستان ملكي' },
              { value: 'wooden-box', label: 'صندوق خشبي أراك فاخر فاخر' },
            ]}
          />
        </div>
      </Dialog>

      {/* BOTTOM SHEET DEMO */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="تصفية الأصناف والقائمة"
        subtitle="تطبيق الفلاتر والبحث حسب المكونات"
        footer={
          <Button
            variant="gold"
            fullWidth
            onClick={() => {
              setIsSheetOpen(false);
              showToast('تم تطبيق الفلاتر', 'تحديث القائمة بـ 12 صنف', 'info');
            }}
          >
            تطبيق الفلترة (12 صنف)
          </Button>
        }
      >
        <div className="space-y-4">
          <Input label="السعر من" placeholder="0 ج.م" />
          <Input label="السعر إلى" placeholder="1000 ج.م" />
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#C8BFB0]">خيارات المكونات:</span>
            <div className="flex flex-wrap gap-2">
              <Chip label="بدون سكر" active />
              <Chip label="بالسمن البلدي" />
              <Chip label="فستق حلبي" active />
              <Chip label="شوكولاتة بلجيكي" />
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
