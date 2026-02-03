import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ConfigProvider, Layout, Menu } from 'antd';
import { HomeOutlined, FundOutlined, BellOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import Dashboard from './pages/Dashboard';
import FundDetailPage from './pages/FundDetailPage';
import PortfolioPage from './pages/PortfolioPage';
import AlertsPage from './pages/AlertsPage';
import './App.css';

const { Header, Content } = Layout;

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ display: 'flex', alignItems: 'center', background: '#001529' }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '50px' }}>
              基金净值估算
            </div>
            <Menu
              theme="dark"
              mode="horizontal"
              defaultSelectedKeys={['1']}
              style={{ flex: 1, minWidth: 0 }}
              items={[
                {
                  key: '1',
                  icon: <HomeOutlined />,
                  label: <Link to="/">首页</Link>,
                },
                {
                  key: '2',
                  icon: <FundOutlined />,
                  label: <Link to="/portfolio">投资组合</Link>,
                },
                {
                  key: '3',
                  icon: <BellOutlined />,
                  label: <Link to="/alerts">价格提醒</Link>,
                },
              ]}
            />
          </Header>
          <Content style={{ background: '#f0f2f5' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fund/:code" element={<FundDetailPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App;
