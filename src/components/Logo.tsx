
import React from 'react';
import { FileText } from 'lucide-react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2 text-extfire-red font-bold text-xl">
      <FileText className="h-6 w-6 text-extfire-red" />
      <span>extfire</span>
    </div>
  );
};

export default Logo;
