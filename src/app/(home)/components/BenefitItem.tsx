import { Brain } from "lucide-react";

interface BenefitItemProps {
  title: string;
  children: React.ReactNode;
}

export default function BenefitItem({ title, children }: BenefitItemProps) {
  return (
    <div className="flex items-start">
      <div className="mr-4 mt-1">
        <Brain className="h-6 w-6 text-purple-600" />
      </div>
      <div>
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="text-gray-600">{children}</p>
      </div>
    </div>
  );
}
