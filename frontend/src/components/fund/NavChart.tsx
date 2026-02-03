import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';
import { fundsApi } from '../../api/funds';
import type { NavHistory } from '../../types';
import dayjs from 'dayjs';

interface NavChartProps {
  fundCode: string;
  height?: number;
}

const NavChart: React.FC<NavChartProps> = ({ fundCode, height = 400 }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NavHistory[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const history = await fundsApi.getNavHistory(fundCode);
        setData(history);
      } catch (error) {
        console.error('Failed to fetch NAV history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fundCode]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
        暂无历史数据
      </div>
    );
  }

  // Prepare data for chart
  const dates = data.map((item) => dayjs(item.date).format('YYYY-MM-DD'));
  const navValues = data.map((item) => item.nav);
  const accumulatedNavValues = data.map((item) => item.accumulated_nav || item.nav);

  const option = {
    title: {
      text: '净值走势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        const date = params[0].axisValue;
        let result = `${date}<br/>`;
        params.forEach((param: any) => {
          result += `${param.marker}${param.seriesName}: ${param.value.toFixed(4)}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['单位净值', '累计净值'],
      top: 30,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        formatter: (value: string) => {
          return dayjs(value).format('MM-DD');
        },
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: '{value}',
      },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        start: 0,
        end: 100,
      },
    ],
    series: [
      {
        name: '单位净值',
        type: 'line',
        data: navValues,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: '#1890ff',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(24, 144, 255, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(24, 144, 255, 0.05)',
              },
            ],
          },
        },
      },
      {
        name: '累计净值',
        type: 'line',
        data: accumulatedNavValues,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: '#52c41a',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: `${height}px` }} />;
};

export default NavChart;
