import Link from 'next/link';

interface FooterProps {
    // Add props if needed in the future
}

const Footer: React.FC<FooterProps> = () => {
    return (
        <footer>
            <ul>
                <li>
                    <p> Phone Number: </p>
                </li>
                <li>
                    <p> Address: </p>
                </li>
                <li>
                    <p> Email: </p>
                </li>
            </ul>
        </footer>
    );
};

export default Footer;
