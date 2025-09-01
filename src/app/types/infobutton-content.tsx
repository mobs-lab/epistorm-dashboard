// InfoButton content sections converted from markdown

import Image from "next/image";

// Activity Levels Info
export const activityLevelsInfo = (
  <div>
    <p>
      Activity levels represent how observed and predicted hospitalization incidence compare to historical baseline and epidemic values for
      a particular region. The thresholds between activity levels are obtained with the Moving Epidemic Method (MEM) using the MEM R package
      [1,2]. Thresholds are based on three seasons of Health and Human Services data from February 2022 through April 2024.
    </p>
    <p>
      After determining an optimal split between epidemic and pre/post-epidemic weeks for each season of data, MEM uses the highest epidemic
      and non-epidemic values to calculate thresholds characterizing the levels of intensity of the epidemic periods and the transition
      between non-epidemic and epidemic periods. The activity levels shown reflect epidemic intensity thresholds such that, over many
      seasons, an expected 40% of weeks would fall below the Medium threshold, 50% of weeks would cross the Medium threshold but fall below
      the High threshold, and 10% of weeks would cross the High threshold.
    </p>
    <div style={{ textAlign: "center", margin: "16px 0" }}>
      {/* Image of the activity thermometer here */}
      <Image
        src='/images/nowcast-help-image-activity.png'
        alt='Example showing trend forecast categories: increasing, stable, and decreasing rates'
        width={960}
        height={300}
        style={{
          maxWidth: "100%",
          height: "auto",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      />
    </div>
    <p>
      [1] Vega et al. (2012) Influenza surveillance in Europe: establishing epidemic thresholds by the moving epidemic method. Influenza and
      Other Respiratory Viruses 7(4), 546-558.
      <br />
      [2] Lozano JE. lozalojo/mem: Second release of the MEM R library. Zenodo [Internet]. [cited 2017 Feb 1]; Available from:
      https://zenodo.org/record/165983.
    </p>
  </div>
);

// Trend Forecast Info
export const trendForecastInfo = (
  <div>
    <div className='flex flex-col lg:flex-row gap-6 items-center'>
      <div className='lg:w-2/5 min-w-0'>
        <p>
          Rate-trend forecasts are submitted by each modeling team to FluSight as probabilities for each rate-trend category. These
          forecasts represent whether hospitalization rates (per 100k population) in a location are expected to increase, decrease, or
          remain stable based upon a model&apos;s nowcast for the selected reference date, relative to the observed hospitalization rate
          from the preceding week. The categories displayed[1] are defined such that:
        </p>
        <ul className="my-4">
          <li>
            A <strong style={{ color: "#b9d6d6" }}>stable</strong> rate-trend indicates that either the magnitude of the predicted change in
            hospitalization rate is less than 0.3/100k, or the magnitude of the predicted change in hospitalization cases is less than 10.
          </li>
          <li>
            An <strong style={{ color: "#eae78b" }}>increasing</strong> rate-trend indicates a positive predicted change in hospitalization
            rate which does not qualify as stable.
          </li>
          <li>
            A <strong style={{ color: "#478791" }}>decreasing</strong> rate-trend indicates a negative predicted change in hospitalization
            rate which does not qualify as stable.
          </li>
        </ul>
        <p>
          For example, a model may predict a probability of 0.5 that the forecasted week's hospitalization rate will remain
          <strong style={{ color: "#b9d6d6" }}>stable</strong> relative to the previous week's observed hospitalization rate, a probability
          of 0.3 that it will <strong style={{ color: "#eae78b" }}>increase</strong>, and a probability of 0.2 that it will{" "}
          <strong style={{ color: "#478791" }}>decrease</strong>.
        </p>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          [1] Submissions to FluSight contain the categories 'large increase' and 'large decrease' in addition to 'increase', 'decrease',
          and 'stable'. For simplicity we combine 'large increase' with 'increase', and 'large decrease' with 'decrease'.
        </p>
      </div>

      <div className='lg:w-3/5 flex items-center justify-center'>
        {/* Image of the trend forecast *not-a-pie-chart here */}
        <Image
          src='/images/nowcast-help-image-trend.png'
          alt='Example showing hospitalization activity forecast levels and predicted levels'
          width={1200}
          height={750}
          className='w-full h-auto border border-gray-300 rounded-lg'
        />
      </div>
    </div>
  </div>
);

// Weekly Hospital Admissions Info
export const weeklyHospitalAdmissionsInfo = (
  <div>
    <p>
      Teams participating in the
      <span>
        {" "}
        <a href='https://github.com/cdcepi/FluSight-forecast-hub' target='_blank' rel='noopener noreferrer'>
          FluSight Forecast Hub
        </a>{" "}
      </span>
      submit quantile nowcasts and forecasts of the weekly number of confirmed influenza hospital admissions for the current epidemiological
      week and the three following epiweeks.
    </p>
    <p>
      The white dotted line represents weekly flu hospitalization surveillance numbers as reported through
      <span>
        {" "}
        <a
          href='https://data.cdc.gov/Public-Health-Surveillance/Weekly-Hospital-Respiratory-Data-HRD-Metrics-by-Ju/mpgq-jmmr/about_data'
          target='_blank'
          rel='noopener noreferrer'>
          CDC&apos;s NHSN
        </a>{" "}
      </span>
      (formerly known as HHS-Protect). Quantile forecasts represent a distribution of modeling outcomes over many simulations. Dotted lines
      for predictions show the median (0.5 quantile) of the distribution, while shaded areas represent prediction intervals (e.g. the 90%
      prediction interval corresponds to the area between the 0.05 quantile and the 0.95 quantile).
    </p>
    <p>
      Click on the chart to select a week and view forecasts submitted for that date. The dashboard will always show the most up-to-date
      surveillance and predictions as revisions and new data are uploaded to the Forecast Hub. Toggle on &#34;Show Data Available at Time of
      Forecast&quot; to view the version of surveillance data which was available when forecasts for the selected week were generated.
    </p>
  </div>
);

// Season Overview Info
export const seasonOverviewInfo = (
  <div>
    <p>
      This page displays evaluations of all Epistorm-affiliated models for comparison, aggregated over all locations and the given time
      period. For more detail on individual models, see the Single Model tab. Here, flu prediction models are scored against surveillance
      data with three methods to evaluate their performance. We use the weighted interval score of a model's quantile forecasts relative to
      the score of a baseline model, the mean absolute percentage error of a model's median prediction, and the prediction interval
      coverage.
    </p>
    <p>
      Select a set of models in the side bar to compare performance on the WIS ratio, MAPE, and PI coverage. The horizon and time period
      selectors filter forecast evaluations for all visualizations. Choose a time period and a set of horizons, e.g. if only horizons 0 and
      3 are selected, evaluations will be displayed only for nowcasts and predictions on a 3-week horizon. Make further selections on the
      map to view a single model's state-wise performance on a certain metric, averaged over the selected horizons and time period.
    </p>
    <p>
The weighted interval score (WIS) is a proper scoring rule applied to a forecast's quantile projections that accounts for the amount of uncertainty in the predictions, and the placement of the predictions in relation to the observed data, where smaller scores are considered better. The WIS ratio is defined as the WIS of each forecasting model divided by the WIS of the FluSight-baseline model (a reference model providing flat projections with the median equal to the most recently observed data point with increasing uncertainty for longer horizons). The boxplots show the distribution of this WIS ratio across forecasting dates and locations for different forecasting horizons. A ratio less than one indicates that the forecasting model performs better, while a ratio greater than one indicates that the baseline model has better performance.
</p>
<p>
The mean absolute percentage error (MAPE) is a relative measure assessing the accuracy of a point prediction against the observed surveillance data, and does not account for the uncertainty in these predictions. The boxplots show the distribution of the MAPE for each model across forecast dates, horizons, and locations, where a smaller value indicates improved performance.
</p>
<p>
The prediction interval coverage (or coverage) is an evaluation metric that describes the percentage of times the observed data falls within a given prediction interval of a forecast across multiple predictions. The coverage assesses the calibration of forecasts. For example, for a well-calibrated model with a 50% prediction interval, the observed data is expected to fall within this interval 50% of the time. In the figure, we show the prediction intervals reported by the modeling teams on the x-axis, and the coverage of the observed data within those intervals on the y-axis. A well-calibrated model should fall along the y=x diagonal. Coverages falling below the y=x line are said to be overconfident, with the data points often falling outside of the prediction intervals due to prediction intervals that are mis-aligned or too narrow. High coverages, above the y=x line, are underconfident since they tend to generate excessively broad prediction intervals. In this plot, the coverage for each forecasting model is averaged over forecast dates, horizons, and locations. 
    </p>
  </div>
);

// WIS Ratio Info
export const wisRatioInfo = (
  <div>
    <p>
      The weighted interval score (WIS) is a proper scoring rule applied to a forecast's quantile projections that accounts for the amount
      of uncertainty in the predictions, and the placement of the predictions in relation to the observed data, where smaller scores are
      considered better. The WIS ratio is defined as the WIS of each forecasting model divided by the WIS of the FluSight-baseline model (a
      reference model providing flat projections with the median equal to the most recently observed data point with increasing uncertainty
      for longer horizons).
    </p>
    <p>
      The boxplots show the distribution of this WIS ratio across forecasting dates and locations for different forecasting horizons. A
      ratio less than one indicates that the forecasting model performs better, where a ratio greater than one describes where the baseline
      model has improved performance.
    </p>
  </div>
);

// MAPE Info
export const mapeInfo = (
  <div>
    <p>
      The mean absolute percentage error (MAPE) is a relative measure assessing the accuracy of a point prediction against the observed
      surveillance data, and does not account for the uncertainty in these predictions. The boxplots show the distribution of the MAPE for
      each model across forecast dates, horizons, and locations, where a smaller value indicates improved performance.
    </p>
  </div>
);

// Coverage Info
export const coverageInfo = (
  <div>
    <p>
      The prediction interval coverage (or coverage) is an evaluation metric that describes the percentage of times the observed data falls
      within a given prediction interval of a forecast across multiple predictions. The coverage assesses the calibration of forecasts. For
      example, for a well-calibrated model with a 50% prediction interval, the observed data is expected to fall within this interval 50% of
      the time.
    </p>
    <p>
      In the figure, we show the prediction intervals reported by the modeling teams on the x-axis, and the coverage of the observed data
      within those intervals on the y-axis. A well-calibrated model should fall along the y=x diagonal.
    </p>
    <ul>
      <li>
        Coverages falling below the y=x line are said to be overconfident, with the data points often falling outside of the prediction
        intervals due to prediction intervals that are mis-aligned or too narrow.
      </li>
      <li>High coverages, above the y=x line, are underconfident since they tend to generate excessively broad prediction intervals.</li>
    </ul>
    <p>In this plot, the coverage for each forecasting model is averaged over forecast dates, horizons, and locations.</p>
  </div>
);

// Single Model Info
export const singleModelInfo = (
  <div>
    <p>
      This page displays the weekly evolution of scores for an individual model's forecasts pertinent to the selected location. For
      time-aggregated side-by-side comparison across models see the Season Overview tab. Here, flu prediction models are scored against
      surveillance data with two methods to evaluate their performance throughout the course of a flu season. We use the weighted interval
      score of a model's quantile forecasts relative to the score of a baseline model and the mean absolute percentage error of a model's
      median prediction.
    </p>
    <p>
The weighted interval score (WIS) is a proper scoring rule applied to a forecast's quantile projections that accounts for the amount of uncertainty in the predictions, and the placement of the predictions in relation to the observed data, where smaller scores are considered better. The WIS ratio is defined as the WIS of each forecasting model divided by the WIS of the FluSight-baseline model (a reference model providing flat projections with the median equal to the most recently observed data point with increasing uncertainty for longer horizons). A ratio less than one indicates that the forecasting model performs better, while a ratio greater than one indicates that the baseline model has better performance.
</p>
<p>
The mean absolute percentage error (MAPE) is a relative measure assessing the accuracy of a point prediction against the observed surveillance data, and does not account for the uncertainty in these predictions.
    </p>
  </div>
);

// Horizon Selectors Info
export const horizonSelectorsInfo = (
  <div>
    <p>
      Forecasts of weekly hospital admissions are made on a horizon ranging from 0 to 3. A forecast with a horizon of 0 is also called a
      "nowcast", i.e. it is a prediction of the total number of flu hospitalizations which will occur over the course of the week within
      which the forecast was made, before the week has concluded. The last day of the predicted week is called the "target date" of the
      forecast.
    </p>
    <p>
      A forecast with a horizon of 3 predicts hospitalizations which will occur over the course of the week ending in the target date which
      is 3 weeks after the end of the week within which the forecast was made.
    </p>
  </div>
);
