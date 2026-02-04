import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Statistic, Row, Col, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { fundsApi } from '../api/funds';
import NavChart from '../components/fund/NavChart';
import NavHistoryTable from '../components/fund/NavHistoryTable';
import type { Fund, RealtimeNav } from '../types';
import { createRealtimeNavWebSocket } from '../api/websocket';

const FundDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [fund, setFund] = useState<Fund | null>(null);
  const [realtimeNav, setRealtimeNav] = useState<RealtimeNav | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    const fetchFundData = async () => {
      setLoading(true);
      try {
        const [fundData, navData] = await Promise.all([
          fundsApi.getFund(code),
          fundsApi.getRealtimeNav(code),
        ]);
        setFund(fundData);
        setRealtimeNav(navData);
      } catch (error: any) {
        message.error('获取基金数据失败');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchFundData();

    // Setup WebSocket for real-time updates
    const ws = createRealtimeNavWebSocket(code);
    ws.connect()
      .then(() => {
        ws.onMessage((msg) => {
          if (msg.type === 'nav_update') {
            setRealtimeNav(msg.data as RealtimeNav);
          }
        });
      })
      .catch((err) => {
        console.error('WebSocket connection failed:', err);
      });

    return () => {
      ws.disconnect();
    };
  }, [code]);

  const handleRefresh = async () => {
    if (!code) return;
    try {
      const navData = await fundsApi.getRealtimeNav(code);
      setRealtimeNav(navData);
      message.success('刷新成功');
    } catch (error) {
      message.error('刷新失败');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!fund || !realtimeNav) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>基金数据加载失败</p>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  const changeColor = realtimeNav.change_percent > 0 ? '#cf1322' : realtimeNav.change_percent < 0 ? '#3f8600' : '#000';

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回
          </Button>
          <h1 style={{ margin: 0 }}>{fund.name}</h1>
        </div>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          刷新
        </Button>
      </div>

      {/* Real-time NAV Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={24}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="单位净值"
              value={realtimeNav.current_nav}
              precision={4}
              valueStyle={{ fontSize: '32px' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="估算净值"
              value={realtimeNav.estimated_nav}
              precision={4}
              valueStyle={{ fontSize: '32px', color: changeColor }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="涨跌幅"
              value={realtimeNav.change_percent}
              precision={2}
              suffix="%"
              valueStyle={{ fontSize: '32px', color: changeColor }}
              prefix={realtimeNav.change_percent > 0 ? '+' : ''}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>交易状态</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {realtimeNav.is_trading_hours ? '交易中' : '已收盘'}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Fund Info Card */}
      <Card title="基金信息" style={{ marginBottom: '24px' }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="基金代码">{fund.code}</Descriptions.Item>
          <Descriptions.Item label="基金名称">{fund.name}</Descriptions.Item>
          <Descriptions.Item label="基金类型">{fund.type || '-'}</Descriptions.Item>
          <Descriptions.Item label="基金公司">{fund.company || '-'}</Descriptions.Item>
          <Descriptions.Item label="添加时间">
            {new Date(fund.created_at).toLocaleString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(realtimeNav.last_update).toLocaleString('zh-CN')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* NAV Chart Card */}
      <Card title="历史净值走势" style={{ marginBottom: '24px' }}>
        <NavChart fundCode={fund.code} height={500} />
      </Card>

      {/* NAV History Table Card */}
      <Card
        title="历史净值明细"
        extra={<span style={{ fontSize: '12px', color: '#8c8c8c' }}>显示最近净值记录</span>}
      >
        <NavHistoryTable fundCode={fund.code} />
      </Card>
    </div>
  );
};

export default FundDetailPage;
