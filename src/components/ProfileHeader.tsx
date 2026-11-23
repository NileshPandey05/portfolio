interface ProfileHeaderProps {
  name: string;
  tagline: string;
  imageSrc: string;
  isDark?: boolean;
}

export function ProfileHeader({
  name,
  tagline,
  imageSrc,
  isDark = true,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-3.5 sm:gap-4">
      <img
        src={imageSrc}
        alt={`${name} profile portrait`}
        decoding="async"
        fetchPriority="high"
        className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-contain select-none"
      />

      <div className="min-w-0 leading-tight">
        <h1
          className={`text-lg sm:text-xl font-semibold tracking-tight transition-colors duration-300 ${
            isDark ? "text-neutral-100" : "text-neutral-900"
          }`}
        >
          {name}
        </h1>
        <p
          className={`mt-0.5 text-xs sm:text-sm tracking-tight transition-colors duration-300 ${
            isDark ? "text-neutral-400" : "text-neutral-600"
          }`}
        >
          {tagline}
        </p>
      </div>
    </div>
  );
}

export default ProfileHeader;
