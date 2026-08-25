import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Sparkles, Plus, Clock, TrendingUp, Check, ChevronLeft, FolderOpen } from 'lucide-react';
import { Product, Category } from '../../types';
import { ProductImage } from '../common/ProductImage';
import { getCategoryArabicName } from '../../constants/categoryTranslations';
import {
  findMatchingCategory,
  findMatchingProducts,
  isExactProductMatch,
  searchHistoryStorage,
  POPULAR_SEARCH_TAGS,
} from '../../services/searchEngine';

interface FloatingSearchProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  onAddToCart: (product: Product) => void;
  onSelectCategory?: (categoryId: string) => void;
  onSelectProduct?: (product: Product) => void;
}

export const FloatingSearch: React.FC<FloatingSearchProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  onAddToCart,
  onSelectCategory,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Sync recent searches on mount & open
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(searchHistoryStorage.getRecentSearches());
    }
  }, [isOpen]);

  // Direct Category Match for current query
  const matchedCategory = useMemo(() => {
    if (!query.trim()) return null;
    return findMatchingCategory(query, categories);
  }, [query, categories]);

  // Instant Search Results matching products
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return findMatchingProducts(query, products, categories);
  }, [query, products, categories]);

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  const handleProductClick = (product: Product) => {
    if (query.trim()) {
      searchHistoryStorage.addRecentSearch(query);
      setRecentSearches(searchHistoryStorage.getRecentSearches());
    }
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    onClose();
  };

  // Handles clicking on Popular or Recent Search tags or Category chips
  const handleTagClick = (tag: string) => {
    const cleanTag = tag.trim();
    
    // 1. Check if tag matches a Category
    const catMatch = findMatchingCategory(cleanTag, categories);
    if (catMatch) {
      searchHistoryStorage.addRecentSearch(cleanTag);
      setRecentSearches(searchHistoryStorage.getRecentSearches());
      if (onSelectCategory) {
        onSelectCategory(catMatch.id);
      }
      onClose();
      return;
    }

    // 2. Check if tag matches an exact Product
    const exactProd = isExactProductMatch(cleanTag, products);
    if (exactProd) {
      searchHistoryStorage.addRecentSearch(cleanTag);
      setRecentSearches(searchHistoryStorage.getRecentSearches());
      if (onSelectProduct) {
        onSelectProduct(exactProd);
      }
      onClose();
      return;
    }

    // 3. Otherwise perform live text search
    setQuery(cleanTag);
    searchHistoryStorage.addRecentSearch(cleanTag);
    setRecentSearches(searchHistoryStorage.getRecentSearches());
  };

  const handleClearHistory = () => {
    const empty = searchHistoryStorage.clearRecentSearches();
    setRecentSearches(POPULAR_SEARCH_TAGS);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-4 sm:pt-12 px-3 sm:px-6 dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Floating Modal Box */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-2xl bg-[#18110B] border border-[#D4AF37]/40 rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header Search Input Bar */}
          <div className="p-4 bg-[#1F1610] border-b border-[#2D2017] flex items-center gap-3">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute right-3.5 w-5 h-5 text-[#D4AF37]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن قسم أو صنف (مثال: ساندوتشات فرنساوي، برجر، أرز باللبن)..."
                autoFocus
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#120C08] border border-[#3D2C1E] text-[#FFF1C5] placeholder-[#8E8373] text-sm focus:outline-none focus:border-[#D4AF37] transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute left-3 p-1 rounded-full bg-[#2A1E15] text-[#C8BFB0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-3 rounded-2xl bg-[#2A1E15] text-[#C8BFB0] hover:text-[#FFF1C5] hover:bg-[#3D2C1E] transition-all text-xs font-bold cursor-pointer shrink-0"
            >
              إغلاق
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">
            {/* Quick Category Chips */}
            <div>
              <div className="flex items-center justify-between mb-2.5 text-xs text-[#C8BFB0] font-bold">
                <span className="flex items-center gap-1.5 text-[#F4E08B]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>تصفح حسب القسم</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((cat, idx) => (
                  <button
                    key={`${cat.id}-${idx}`}
                    onClick={() => {
                      if (onSelectCategory) onSelectCategory(cat.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#221710] border border-[#3D2C1E] text-xs font-medium text-[#C8BFB0] hover:text-[#F4E08B] hover:border-[#D4AF37]/50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{cat.emoji || '📁'}</span>
                    <span>{getCategoryArabicName(cat)}</span>
                    <span className="text-[10px] text-[#8E8373] bg-[#140E0A] px-1.5 py-0.5 rounded-md">
                      {cat.itemCount || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular and Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5 text-xs text-[#C8BFB0] font-bold">
                  <span className="flex items-center gap-1.5 text-[#C8BFB0]">
                    <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>عمليات البحث الشائعة والأخيرة</span>
                  </span>

                  <button
                    onClick={handleClearHistory}
                    className="text-[11px] text-[#8E8373] hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    إعادة ضبط
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTagClick(tag)}
                      className="px-3.5 py-2 rounded-xl bg-[#1C130D] border border-[#2D2017] text-xs text-[#FFF1C5] hover:border-[#D4AF37] hover:text-[#F4E08B] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Search Results View */}
            {query && (
              <div className="space-y-4">
                {/* 1. Category Shortcut Banner if search query matched a Category */}
                {matchedCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-[#2A1D13] via-[#22160E] to-[#2A1D13] border border-[#D4AF37]/60 shadow-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-2xl shrink-0">
                        {matchedCategory.emoji || '📂'}
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#F4E08B] bg-[#D4AF37]/20 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                            قسم رئيسي
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-[#FFF1C5]">
                          {getCategoryArabicName(matchedCategory)}
                        </h4>
                        <p className="text-[11px] text-[#8E8373] line-clamp-1">
                          {matchedCategory.descriptionAr ||
                            `تصفح كافة أصناف قسم ${getCategoryArabicName(matchedCategory)}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        searchHistoryStorage.addRecentSearch(query);
                        if (onSelectCategory) onSelectCategory(matchedCategory.id);
                        onClose();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gold-gradient text-black font-extrabold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>تصفح القسم بالكامل</span>
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </motion.div>
                )}

                {/* Results Count Header */}
                <div className="flex items-center justify-between text-xs text-[#C8BFB0] border-b border-[#2C1F16] pb-2">
                  <span>نتائج الأصناف عن "{query}":</span>
                  <span className="font-bold text-[#F4E08B]">{searchResults.length} صنف</span>
                </div>

                {/* 2. Product Results Grid */}
                {searchResults.length === 0 && !matchedCategory ? (
                  <div className="py-12 text-center space-y-3 bg-[#120C08] rounded-2xl border border-[#2C1F16] p-6">
                    <Search className="w-10 h-10 text-[#59493B] mx-auto" />
                    <h4 className="text-base font-bold text-[#FFF1C5]">لا توجد أصناف.</h4>
                    <p className="text-xs text-[#8E8373]">
                      تأكد من كتابة الاسم بشكل صحيح أو تصفح الأقسام الرئيسية مباشرة.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchResults.map((product, idx) => (
                      <div
                        key={`${product.id}-${idx}`}
                        onClick={() => handleProductClick(product)}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-[#1C130D] border border-[#2D2017] hover:border-[#D4AF37]/60 transition-all group cursor-pointer"
                      >
                        <ProductImage
                          src={product.image || product.imageUrl}
                          alt={product.nameAr}
                          className="w-16 h-16 rounded-xl shrink-0 border border-[#3D2C1E] object-cover"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-[#FFF1C5] truncate group-hover:text-[#F4E08B] transition-colors">
                              {product.nameAr}
                            </h4>
                            {(product.isAvailable === false || product.available === false) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold shrink-0">
                                غير متوفر
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8E8373] line-clamp-1 mt-0.5">
                            {product.shortDescriptionAr || product.descriptionAr}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs font-black text-[#F4E08B]">
                              {product.price} ج.م
                            </span>

                            {product.isAvailable === false || product.available === false ? (
                              <button
                                disabled
                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed"
                              >
                                غير متوفر
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleQuickAdd(product, e)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  addedProductId === product.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gold-gradient text-black hover:brightness-110'
                                }`}
                              >
                                {addedProductId === product.id ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>تمت الإضافة</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3 text-black" />
                                    <span>أضف</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

