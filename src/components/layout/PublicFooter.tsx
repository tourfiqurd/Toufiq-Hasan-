import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#0B1437] text-white no-print">
      <div className="max-w-[1250px] mx-auto px-5 sm:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="space-y-4">
          <BrandLogo onDark />
          <p className="text-sm text-white/75 max-w-xs leading-relaxed">
            বাংলাদেশের স্কুল, কলেজ ও মাদ্রাসার জন্য নির্ভুল পরীক্ষা, নম্বর এন্ট্রি, ট্যাবুলেশন ও ডিজিটাল মার্কশিট ব্যবস্থাপনা প্ল্যাটফর্ম।
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">প্ল্যাটফর্ম</h3>
          <ul className="space-y-2 text-sm text-white/75">
            <li>
              <Link to="/" className="hover:text-white transition-colors">
                হোম
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-white transition-colors">
                প্রতিষ্ঠান নিবন্ধন
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white transition-colors">
                ড্যাশবোর্ড লগইন
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">প্রতিষ্ঠান</h3>
          <ul className="space-y-2 text-sm text-white/75">
            <li>
              <Link to="/about" className="hover:text-white transition-colors">
                আমাদের সম্পর্কে
              </Link>
            </li>
            <li>
              <Link to="/about#contact" className="hover:text-white transition-colors">
                সহায়তা ও পরামর্শ
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">যোগাযোগ</h3>
          <ul className="space-y-2.5 text-sm text-white/75">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#14B8A6] shrink-0" aria-hidden="true" />
              <span>support@academia.edu.bd</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#14B8A6] shrink-0" aria-hidden="true" />
              <span className="tabular-nums">+৮৮০ ১৭১১-০০২২৩৩</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" aria-hidden="true" />
              <span>হাউজ ৪২, রোড ১২, ধানমন্ডি, ঢাকা-১২০৯</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1250px] mx-auto px-5 sm:px-8 py-5 flex items-center justify-between gap-4 text-xs text-white/70">
          <p>© ২০২৬ একাডেমিয়া। সর্বস্বত্ব সংরক্ষিত।</p>
        </div>
      </div>
    </footer>
  );
};
