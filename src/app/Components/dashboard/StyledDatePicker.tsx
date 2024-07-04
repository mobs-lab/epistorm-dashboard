import React from 'react';
import DatePicker from 'react-date-picker';
import 'react-calendar/dist/Calendar.css';
import '../../CSS/StyledDatePicker.css';

const StyledDatePicker = ({value, onChange, minDate, maxDate}) => {
    return (
        <DatePicker
            onChange={onChange}
            value={value}
            minDate={minDate}
            maxDate={maxDate}
            className="styled-date-picker"
        />
    );
};

export default StyledDatePicker;