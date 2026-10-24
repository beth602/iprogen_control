import { Building2 } from 'lucide-react';

interface LogoProps {
  src?: string;
  size?: number;
}

export default function Logo({ src = "/logo-iprogen-light.png", size = 80 }: LogoProps) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt="Logo IPROGEN"
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <Building2
          className="text-white"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      )}
    </div>
  );
}