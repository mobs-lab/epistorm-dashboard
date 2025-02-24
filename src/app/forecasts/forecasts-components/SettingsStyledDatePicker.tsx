import React from 'react';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';
import '../../css/component_styles/StyledDatePicker.css';

interface StyledDatePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    minDate?: Date;
    maxDate?: Date;
    className?: string;
}

const SettingsStyledDatePicker: React.FC<StyledDatePickerProps> = ({value, onChange, minDate, maxDate, className}) => {
    return (
        <div className={`styled-date-picker ${className}`}>
            <DatePicker
                onChange={onChange}
                value={value}
                minDate={minDate}
                maxDate={maxDate}
                format="y-MM-dd"
                className="custom-date-picker"
                calendarClassName="custom-calendar"
                clearIcon={null}
                calendarIcon={null}
            />
        </div>
    );
};

export default SettingsStyledDatePicker;