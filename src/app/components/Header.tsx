import Link from 'next/link';

interface HeaderProps {
    // Add props if needed in the future
}

const Header: React.FC<HeaderProps> = () => {
    return (
        <header>
            <nav>
                <Link href="../"> Home </Link>
                <Link href="../forecasts">Forecasts</Link>
                <Link href="../contact">Contact</Link>
                <Link href="../background">Background</Link>
            </nav>
        </header>
    );
};

export default Header;
