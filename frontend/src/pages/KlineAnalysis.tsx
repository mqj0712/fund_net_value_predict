import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Select,
  DatePicker,
  Switch,
  Button,
  Spin,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Tag,
  Statistic,
  Alert,
  Modal,
  Input,
  message,
  AutoComplete,
  Descriptions,
} from 'antd';
import { PlusOutlined, ReloadOutlined, BankOutlined, FundOutlined, CalendarOutlined, TagOutlined } from '@ant-design/icons';
import Plot from 'react-plotly.js';
import dayjs, { Dayjs } from 'dayjs';
import { klineApi } from '@/api/kline';
import { fundsApi } from '@/api/funds';
import type { KlineResponse, KlineSummary, KlinePeriod, Fund } from '@/types';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const KlineAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [fundCode, setFundCode] = useState('159246');
  const [inputFundCode, setInputFundCode] = useState('159246');
  const [period, setPeriod] = useState<KlinePeriod>('daily');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [showIndicators, setShowIndicators] = useState(true);
  const [klineData, setKlineData] = useState<KlineResponse | null>(null);
  const [summary, setSummary] = useState<KlineSummary | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [currentFund, setCurrentFund] = useState<Fund | null>(null);
  
  // Modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newFundCode, setNewFundCode] = useState('');
  const [newFundName, setNewFundName] = useState('');
  const [addingFund, setAddingFund] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load fund list on mount
  const loadFunds = async () => {
    setFundsLoading(true);
    try {
      const response = await fundsApi.listFunds(1, 100);
      setFunds(response.items);
      
      // Set initial fund if list is loaded and no fund is selected
      if (fundCode === '159246' && response.items.length > 0 && !response.items.find(f => f.code === '159246')) {
        setFundCode(response.items[0].code);
        setInputFundCode(response.items[0].code);
      }
    } catch (error) {
      console.error('Failed to load funds:', error);
      message.error('加载基金列表失败');
    } finally {
      setFundsLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD');
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD');

      const [dataRes, summaryRes, fundRes] = await Promise.all([
        klineApi.getKlineData(fundCode, period, startDate, endDate, showIndicators),
        klineApi.getKlineSummary(fundCode, period),
        fundsApi.getFund(fundCode),
      ]);

      setKlineData(dataRes);
      setSummary(summaryRes);
      setCurrentFund(fundRes);
    } catch (error) {
      console.error('Failed to load K-line data:', error);
      message.error('加载K线数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryKline = async () => {
    if (!inputFundCode.trim()) {
      message.error('请输入基金代码');
      return;
    }
    setFundCode(inputFundCode.trim());
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [period, dateRange, showIndicators]);

  const handleAddFund = async () => {
    if (!newFundCode.trim()) {
      message.error('请输入基金代码');
      return;
    }

    setAddingFund(true);
    try {
      await fundsApi.createFund({
        code: newFundCode.trim(),
        name: newFundName.trim() || undefined,
      });

      message.success(`基金 ${newFundCode.trim()} 添加成功`);
      setAddModalVisible(false);
      setNewFundCode('');
      setNewFundName('');
      
      // Reload fund list
      await loadFunds();
      
      // Switch to new fund
      setFundCode(newFundCode.trim());
      setInputFundCode(newFundCode.trim());
    } catch (error: any) {
      console.error('Failed to add fund:', error);
      message.error(error?.response?.data?.detail || '添加基金失败');
    } finally {
      setAddingFund(false);
    }
  };

  const handleRefresh = () => {
    Promise.all([loadFunds(), loadData()]);
  };

  const formatNumber = (num: number, decimals: number = 4): string => {
    return num.toFixed(decimals);
  };

  const getTrendColor = (signal: string): string => {
    switch (signal) {
      case 'bullish':
      case 'overbought':
        return 'red';
      case 'bearish':
      case 'oversold':
        return 'green';
      default:
        return 'default';
    }
  };

  // Filter options for search
  const fundOptions = funds.map(fund => ({
    value: fund.code,
    label: `${fund.code} - ${fund.name}`,
  }));

  const prepareKlineTrace = () => {
    if (!klineData) return [];

    const dates = klineData.kline_data.map((d) => d.date);
    const open = klineData.kline_data.map((d) => d.open);
    const high = klineData.kline_data.map((d) => d.high);
    const low = klineData.kline_data.map((d) => d.low);
    const close = klineData.kline_data.map((d) => d.close);

    const traces: any[] = [
      {
        x: dates,
        open: open,
        high: high,
        low: low,
        close: close,
        type: 'candlestick',
        name: 'K线',
        increasing: { line: { color: '#ff4545' } },
        decreasing: { line: { color: '#2ec4c6' } },
      },
    ];

    if (showIndicators && klineData.indicators_enabled) {
      if (klineData.kline_data.some((d) => d.MA5)) {
        traces.push({
          x: dates,
          y: klineData.kline_data.map((d) => d.MA5),
          type: 'scatter',
          mode: 'lines',
          name: 'MA5',
          line: { color: '#FFA500', width: 1 },
        });
      }

      if (klineData.kline_data.some((d) => d.MA10)) {
        traces.push({
          x: dates,
          y: klineData.kline_data.map((d) => d.MA10),
          type: 'scatter',
          mode: 'lines',
          name: 'MA10',
          line: { color: '#FFD700', width: 1 },
        });
      }

      if (klineData.kline_data.some((d) => d.MA20)) {
        traces.push({
          x: dates,
          y: klineData.kline_data.map((d) => d.MA20),
          type: 'scatter',
          mode: 'lines',
          name: 'MA20',
          line: { color: '#FF69B4', width: 1 },
        });
      }

      if (klineData.kline_data.some((d) => d.BOLL_UPPER)) {
        traces.push({
          x: dates,
          y: klineData.kline_data.map((d) => d.BOLL_UPPER),
          type: 'scatter',
          mode: 'lines',
          name: '布林带上轨',
          line: { color: '#9370DB', width: 0.5, dash: 'dash' },
        });
      }

      if (klineData.kline_data.some((d) => d.BOLL_LOWER)) {
        traces.push({
          x: dates,
          y: klineData.kline_data.map((d) => d.BOLL_LOWER),
          type: 'scatter',
          mode: 'lines',
          name: '布林带下轨',
          line: { color: '#9370DB', width: 0.5, dash: 'dash' },
        });
      }
    }

    return traces;
  };

  const prepareMACDTrace = () => {
    if (!klineData || !showIndicators || !klineData.indicators_enabled) return [];
    if (!klineData.kline_data.some((d) => d.MACD_DIF)) return [];

    const dates = klineData.kline_data.map((d) => d.date);

    return [
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.MACD_DIF),
        type: 'scatter',
        mode: 'lines',
        name: 'DIF',
        line: { color: '#ff4545', width: 1 },
      },
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.MACD_DEA),
        type: 'scatter',
        mode: 'lines',
        name: 'DEA',
        line: { color: '#2ec4c6', width: 1 },
      },
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.MACD_HIST),
        type: 'bar',
        name: 'MACD',
        marker: {
          color: klineData.kline_data.map((d) => (d.MACD_HIST || 0) > 0 ? '#ff4545' : '#2ec4c6'),
        },
      },
    ];
  };

  const prepareKDjTrace = () => {
    if (!klineData || !showIndicators || !klineData.indicators_enabled) return [];
    if (!klineData.kline_data.some((d) => d.KDJ_K)) return [];

    const dates = klineData.kline_data.map((d) => d.date);

    return [
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.KDJ_K),
        type: 'scatter',
        mode: 'lines',
        name: 'K',
        line: { color: '#ff4545', width: 1 },
      },
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.KDJ_D),
        type: 'scatter',
        mode: 'lines',
        name: 'D',
        line: { color: '#FFD700', width: 1 },
      },
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.KDJ_J),
        type: 'scatter',
        mode: 'lines',
        name: 'J',
        line: { color: '#9370DB', width: 1 },
      },
    ];
  };

  const prepareRSITrace = () => {
    if (!klineData || !showIndicators || !klineData.indicators_enabled) return [];
    if (!klineData.kline_data.some((d) => d.RSI6)) return [];

    const dates = klineData.kline_data.map((d) => d.date);

    return [
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.RSI6),
        type: 'scatter',
        mode: 'lines',
        name: 'RSI(6)',
        line: { color: '#ff4545', width: 1 },
      },
      {
        x: dates,
        y: klineData.kline_data.map((d) => d.RSI12),
        type: 'scatter',
        mode: 'lines',
        name: 'RSI(12)',
        line: { color: '#FFD700', width: 1 },
      },
    ];
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>K线分析</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={10} lg={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>选择基金:</Text>
                <Space.Compact style={{ width: '100%' }}>
                  <AutoComplete
                    value={inputFundCode}
                    onChange={setInputFundCode}
                    options={fundOptions}
                    placeholder="输入基金代码或名称搜索"
                    filterOption={(inputValue, option) =>
                      option!.label.toUpperCase().includes(inputValue.toUpperCase())
                  }
                    style={{ flex: 1 }}
                    loading={fundsLoading}
                    onPressEnter={handleQueryKline}
                  />
                  <Button type="primary" onClick={handleQueryKline} loading={loading}>
                    查询
                  </Button>
                </Space.Compact>
              </Space>
            </Col>

            <Col xs={24} sm={12} md={6} lg={4}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>周期:</Text>
                <Select value={period} onChange={setPeriod} style={{ width: '100%' }}>
                  <Select.Option value="daily">日K</Select.Option>
                  <Select.Option value="weekly">周K</Select.Option>
                  <Select.Option value="monthly">月K</Select.Option>
                </Select>
              </Space>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>日期范围:</Text>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  format="YYYY-MM-DD"
                  style={{ width: '100%' }}
                />
              </Space>
            </Col>

            <Col xs={24} sm={12} md={6} lg={6}>
              <Space>
                <Space direction="vertical">
                  <Text strong>技术指标:</Text>
                  <Switch checked={showIndicators} onChange={setShowIndicators} />
                </Space>
                <Button icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
                  添加基金
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading || fundsLoading}>
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>

          {funds.length > 0 && (
            <Divider orientation="left" style={{ margin: '12px 0', fontSize: '12px' }}>
              快速选择
            </Divider>
          )}

          <Row gutter={[8, 8]}>
            {funds.slice(0, 8).map((fund) => (
              <Col key={fund.id}>
                <Tag
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  color={fund.code === fundCode ? 'blue' : 'default'}
                  onClick={() => {
                    setInputFundCode(fund.code);
                    setFundCode(fund.code);
                  }}
                >
                  {fund.code}
                </Tag>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      {summary && (
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="昨日收盘"
                value={summary.latest.close}
                precision={4}
                valueStyle={{ color: summary.latest.change < 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="涨跌幅"
                value={summary.latest.change_pct}
                precision={2}
                suffix="%"
                valueStyle={{ color: summary.latest.change_pct < 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic title="30日最高" value={summary.statistics.high_30} precision={4} />
            </Col>
            <Col span={6}>
              <Statistic title="30日最低" value={summary.statistics.low_30} precision={4} />
            </Col>
          </Row>
          <Divider />
          <Space size="large">
            <span>
              趋势:<Tag color={getTrendColor(summary.signals.trend)}>{summary.signals.trend}</Tag>
            </span>
            <span>
              MACD:
              <Tag color={getTrendColor(summary.signals.macd)}>{summary.signals.macd}</Tag>
            </span>
            <span>
              RSI:
              <Tag color={getTrendColor(summary.signals.rsi)}>{summary.signals.rsi}</Tag>
            </span>
          </Space>
        </Card>
      )}

      {currentFund && (
        <Card 
          style={{ marginBottom: 24 }} 
          title={
            <Space>
              <FundOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                {currentFund.name}
              </Title>
            </Space>
          }
        >
          <Descriptions
            bordered
            column={{ xs: 1, sm: 2, md: 4 }}
            size="middle"
          >
            <Descriptions.Item
              label="基金代码"
              labelStyle={{ fontWeight: 'bold' }}
            >
              <Tag color="blue" style={{ fontSize: '16px', padding: '4px 12px' }}>
                {currentFund.code}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item
              label={<><TagOutlined style={{ marginRight: 4 }} />基金类型</>}
              labelStyle={{ fontWeight: 'bold' }}
            >
              {currentFund.type || <span style={{ color: '#999' }}>未设置</span>}
            </Descriptions.Item>
            <Descriptions.Item
              label={<><BankOutlined style={{ marginRight: 4 }} />基金公司</>}
              labelStyle={{ fontWeight: 'bold' }}
            >
              {currentFund.company || <span style={{ color: '#999' }}>未设置</span>}
            </Descriptions.Item>
            <Descriptions.Item
              label={<><CalendarOutlined style={{ marginRight: 4 }} />创建时间</>}
              labelStyle={{ fontWeight: 'bold' }}
            >
              {dayjs(currentFund.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
          {klineData && (
            <div style={{ marginTop: 16 }}>
              <Space size="large">
                <Text type="secondary">
                  数据周期: <Tag color="green">{period === 'daily' ? '日K' : period === 'weekly' ? '周K' : '月K'}</Tag>
                </Text>
                <Text type="secondary">
                  数据量: <Tag color="purple">{klineData.data_count} 条记录</Tag>
                </Text>
                {klineData.start_date && klineData.end_date && (
                  <Text type="secondary">
                    日期范围: <Tag color="cyan">
                      {klineData.start_date.split('T')[0]} 至 {klineData.end_date.split('T')[0]}
                    </Tag>
                  </Text>
                )}
              </Space>
            </div>
          )}
        </Card>
      )}

      <Spin spinning={loading}>
        {klineData && (
          <Card>
            <Title level={4}>K线图</Title>
            <div ref={containerRef}>
              <Plot
                data={prepareKlineTrace()}
                layout={{
                  autosize: true,
                  title: `${klineData.fund_name} - ${klineData.period}`,
                  xaxis: {
                    title: '日期',
                    type: 'date',
                  },
                  yaxis: {
                    title: '价格',
                    side: 'right',
                  },
                  hovermode: 'x unified',
                  dragmode: 'zoom',
                  margin: { l: 0, r: 60, t: 50, b: 40 },
                }}
                style={{ width: '100%', height: '500px' }}
                useResizeHandler
                config={{ responsive: true }}
              />
            </div>

            {showIndicators && klineData.indicators_enabled && (
              <>
                {prepareMACDTrace().length > 0 && (
                  <>
                    <Divider />
                    <Title level={4}>MACD</Title>
                    <Plot
                      data={prepareMACDTrace()}
                      layout={{
                        autosize: true,
                        xaxis: { title: '日期' },
                        yaxis: { title: 'MACD', side: 'right' },
                        hovermode: 'x unified',
                        margin: { l: 0, r: 60, t: 30, b: 40 },
                      }}
                      style={{ width: '100%', height: '300px' }}
                      useResizeHandler
                    />
                  </>
                )}

                {prepareKDjTrace().length > 0 && (
                  <>
                    <Divider />
                    <Title level={4}>KDJ</Title>
                    <Plot
                      data={prepareKDjTrace()}
                      layout={{
                        autosize: true,
                        xaxis: { title: '日期' },
                        yaxis: { title: 'KDJ', side: 'right' },
                        hovermode: 'x unified',
                        margin: { l: 0, r: 60, t: 30, b: 40 },
                      }}
                      style={{ width: '100%', height: '300px' }}
                      useResizeHandler
                    />
                  </>
                )}

                {prepareRSITrace().length > 0 && (
                  <>
                    <Divider />
                    <Title level={4}>RSI</Title>
                    <Plot
                      data={prepareRSITrace()}
                      layout={{
                        autosize: true,
                        xaxis: { title: '日期' },
                        yaxis: { title: 'RSI', side: 'right' },
                        hovermode: 'x unified',
                        margin: { l: 0, r: 60, t: 30, b: 40 },
                      }}
                      style={{ width: '100%', height: '300px' }}
                      useResizeHandler
                    />
                  </>
                )}
              </>
            )}
          </Card>
        )}
      </Spin>

      {/* Add Fund Modal */}
      <Modal
        title="添加新基金"
        open={addModalVisible}
        onOk={handleAddFund}
        onCancel={() => {
          setAddModalVisible(false);
          setNewFundCode('');
          setNewFundName('');
        }}
        confirmLoading={addingFund}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>基金代码 *</Text>
            <Input
              placeholder="例如: 159246"
              value={newFundCode}
              onChange={(e) => setNewFundCode(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Text strong>基金名称</Text>
            <Input
              placeholder="例如: 创业板人工智能ETF富国"
              value={newFundName}
              onChange={(e) => setNewFundName(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          <Alert
            message="提示"
            description="基金代码必填，系统会自动从API获取基金信息。名称可选，若为空将自动获取。"
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
};

export default KlineAnalysis;
