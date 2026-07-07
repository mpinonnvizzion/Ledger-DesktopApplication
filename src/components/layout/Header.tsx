interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-14 items-center border-b border-gray-200 px-6">
      <h1 className="text-lg font-medium text-gray-900">{title}</h1>
    </header>
  );
}
