library(tidyverse)
library(magrittr)
library(mem)

### Prepare data.

# Load from files.
locations <- read_csv('./public/data/locations.csv', col_select=c(location, location_name, population))

hhs <- read_csv('./public/data/ground-truth/target-hospital-admissions.csv', col_select = c(date, location, value, weekly_rate))
hhs %<>% mutate(week = epiweek(hhs$date))
hhs %<>% mutate(year = year(date)) 

fsn <- read_csv('./flusurvnet_data.csv', na=c("", "NA", "null")) %>%
  filter(`AGE CATEGORY`=='Overall' & `SEX CATEGORY`=='Overall' & `RACE CATEGORY`=='Overall') %>%
  select(1, 3:5, 10) %>%
  drop_na() 
fsn <- fsn %>%
  mutate(CATCHMENT=case_match(fsn$CATCHMENT, 'Entire Network'~'US', .default=fsn$CATCHMENT)) %>%
  inner_join(locations, by=join_by('CATCHMENT'=='location_name')) %>%
  rename(c(location_name='CATCHMENT', year='MMWR-YEAR', week='MMWR-WEEK', weekly_rate='WEEKLY RATE'))

# Sanity check: do weekly rates from HHS surveillance file match per 100,000 pop rates calculated from raw incidence values?
# (non-rate values unavailable for FSN)
# Result prints to console.
hhs <- inner_join(locations, hhs, by='location')

hhs %<>% 
  mutate(calculated_rate = 100000 * (value / population)) 
hhs %<>%
  mutate(sanity_check = near(weekly_rate, calculated_rate, tol=0.00000001))

hhs$sanity_check %>% has_element(FALSE) %>% cat('Do any rows fail the sanity check?')


### Calculate thresholds for all locations and check percentage of observations crossing thresholds.

# Function to calculate thresholds for given location and surveillance dataset. Use location codes as input.
get_thresholds <- function(loc, data, use_bracher=FALSE) {
  # Transform data for memmodel.
  transformed <- data %>%
    filter(location == loc) %>%
    select(c(year, week, weekly_rate)) %>%
    transformdata(i.name='weekly_rate', i.range.x=c(40,20))
  
  # Calculate thresholds.
  if (use_bracher) {
    model_output <- transformed$data %>% memmodel(i.n.max=1)
  } else {
    model_output <- transformed$data %>% memmodel()
  }
  thresholds <- model_output %>% memintensity()
  thresholds <- thresholds$intensity.thresholds[1,]
  thresholds %<>% append(list(location=loc))
  
  return(as_tibble_row(thresholds))
}

# Calculate thresholds for all locations in HHS data.
hhs_thresholds <- locations$location %>%
  map(\(x) get_thresholds(x, hhs)) %>%
  bind_rows() %>%
  column_to_rownames('location')
# Calculate thresholds based on US FSN data.
fsn_thresholds <- get_thresholds('US', fsn)
fsn_thresholds_bracher <- get_thresholds('US', fsn, TRUE)

# Check percentage of observations crossing HHS thresholds.
check_pct_exceed_hhs_thres <- function(loc, data) {
  state_data <- data %>%
    filter(location == loc) %>%
    select(c(location, year, week, weekly_rate)) %>%
    mutate(cross_med = weekly_rate >= hhs_thresholds[loc,2]) %>%
    mutate(cross_hi = weekly_rate >= hhs_thresholds[loc,3]) %>%
    mutate(cross_vhi = weekly_rate >= hhs_thresholds[loc,4])
  
  pct_med = length(state_data$cross_med[state_data$cross_med == TRUE]) / length(state_data$cross_med)
  pct_hi = length(state_data$cross_hi[state_data$cross_hi == TRUE]) / length(state_data$cross_hi)
  pct_vhi = length(state_data$cross_vhi[state_data$cross_vhi == TRUE]) / length(state_data$cross_vhi)
  
  return(as_tibble_row(list('location'=loc, 'med'=pct_med, 'hi'=pct_hi, 'vhi'=pct_vhi)))
}

# Check percentage of observations crossing FSN total US thresholds.
check_pct_exceed_fsn_thres <- function(loc, data, use_bracher=FALSE) {
  if (use_bracher) {thres=fsn_thresholds_bracher} else {thres=fsn_thresholds}
  state_data <- data %>%
    filter(location == loc) %>%
    select(c(location, year, week, weekly_rate)) %>%
    mutate(cross_med = weekly_rate >= thres[[1,2]]) %>%
    mutate(cross_hi = weekly_rate >= thres[[1,3]]) %>%
    mutate(cross_vhi = weekly_rate >= thres[[1,4]])
  
  pct_med = length(state_data$cross_med[state_data$cross_med == TRUE]) / length(state_data$cross_med)
  pct_hi = length(state_data$cross_hi[state_data$cross_hi == TRUE]) / length(state_data$cross_hi)
  pct_vhi = length(state_data$cross_vhi[state_data$cross_vhi == TRUE]) / length(state_data$cross_vhi)
  
  return(as_tibble_row(list('location'=loc, 'med'=pct_med, 'hi'=pct_hi, 'vhi'=pct_vhi)))
}

# Percentage of observations crossing HHS thresholds in HHS data.
pct_hhs_exceed_hhs_thres <- locations$location %>%
  map(\(x) check_pct_exceed_hhs_thres(x, hhs)) %>%
  bind_rows()

# Percentage of observations crossing HHS thresholds in FSN data.
pct_fsn_exceed_hhs_thres <- locations$location %>%
  map(\(x) check_pct_exceed_hhs_thres(x, fsn)) %>%
  bind_rows() %>%
  drop_na()

# Percentage of observations crossing FSN thresholds in HHS data.
pct_hhs_exceed_fsn_thres <- locations$location %>%
  map(\(x) check_pct_exceed_fsn_thres(x, hhs)) %>%
  bind_rows()

# Percentage of observations crossing Bracher FSN thresholds in HHS data.
pct_hhs_exceed_fsn_thres_bracher <- locations$location %>%
  map(\(x) check_pct_exceed_fsn_thres(x, hhs, TRUE)) %>%
  bind_rows()

# Plot 
plot_series <- function(loc, data) {
  transformed <- data %>%
    filter(location == loc) %>%
    select(c(year, week, weekly_rate)) %>%
    transformdata(i.name='weekly_rate', i.range.x=c(40,20))
  
  model_output <- transformed$data %>% memmodel()
  loc_name <- locations %>% filter(location==loc) %>% select(location_name)
  full.series.graph(transformed$data, i.graph.file.name=paste0("memseries/fsn/fsn_thres_", loc_name[[1]]), 
                    i.graph.title=loc_name[[1]], i.graph.subtitle='hhs surveillance data w/ fsn thresholds, mem defaults',
                    i.plot.intensity=T, i.mem.info=F)
}

plot_series <- function(loc) {
  #fsn_transformed <- fsn %>%
  #  filter(location == 'US') %>%
  #  select(c(year, week, weekly_rate)) %>%
  #  transformdata(i.name='weekly_rate', i.range.x=c(40,20))
  
  hhs_transformed <- hhs %>%
    filter(location == loc) %>%
    select(c(year, week, weekly_rate)) %>%
    transformdata(i.name='weekly_rate', i.range.x=c(40,20))
  
  alt_thres <- fsn_thresholds[1:4] %>% unlist()
  #return(transformed)
  #model_output <- fsn_transformed$data %>% memmodel()
  loc_name <- locations %>% filter(location==loc) %>% select(location_name)
  full.series.graph(hhs_transformed$data, i.graph.file.name=paste0("memseries/fsn/fsn_thres_", loc_name[[1]]), 
                    i.graph.title=loc_name[[1]], i.graph.subtitle='hhs surveillance data w/ fsn thresholds, mem defaults',
                    i.alternative.thresholds=alt_thres, i.plot.intensity=T, i.mem.info=F)
}

#locations$location %>%
#  walk(\(x) plot_series(x, hhs))

locations$location %>%
  walk(\(x) plot_series(x))



fsn %<>% mutate(date = as.Date(str_c(fsn$year,fsn$week,'1'), '%Y%U%u'))

ggplot(filter(fsn, location=='US'), aes(x=date, y=weekly_rate)) +
  geom_line() +
  geom_hline(yintercept=unlist(fsn_thresholds[1:4]))

# Questions:
# Use typical season / surveillance period (wks 40-20) or larger?
# 
# Multiple waves? If so, may need to separate for reliable results.
# 
# 




