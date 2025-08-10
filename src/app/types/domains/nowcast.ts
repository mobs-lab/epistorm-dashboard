export interface NowcastTrend {
  location: string;
  reference_date: Date;
  decrease: number;
  increase: number;
  stable: number;
}

export interface NowcastTrendByModel {
  modelName: string;
  data: NowcastTrend[];
}

export interface NowcastTrendsCollection {
  allData: NowcastTrendByModel[];
}


