import Link from 'next/link';

interface HeaderProps {
    // Add any other props your header might need, with their corresponding types
}

const Header: React.FC<HeaderProps> = () => {
    return (
        <header>
            <nav>
                <Link href="../app/forecasts">Forecasts</Link>
                <Link href="../app/contact">Contact</Link>
                <Link href="../app/background">Background</Link>
            </nav>
        </header>
    );
};

export default Header;
