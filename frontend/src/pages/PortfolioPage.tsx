import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Statistic,
  Row,
  Col,
  Empty,
  Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { usePortfolioStore } from '../store/portfolioStore';
import { useFundStore } from '../store/fundStore';
import dayjs from 'dayjs';

const PortfolioPage: React.FC = () => {
  const {
    portfolios,
    selectedPortfolio,
    performance,
    loading,
    fetchPortfolios,
    createPortfolio,
    selectPortfolio,
    deletePortfolio,
    addItem,
    deleteItem,
    fetchPerformance,
  } = usePortfolioStore();

  const { funds, fetchFunds } = useFundStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [addItemForm] = Form.useForm();

  useEffect(() => {
    fetchPortfolios();
    fetchFunds();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      fetchPerformance(selectedPortfolio.id);
    }
  }, [selectedPortfolio]);

  const handleCreatePortfolio = async (values: any) => {
    try {
      await createPortfolio(values);
      message.success('创建成功');
      setIsCreateModalOpen(false);
      createForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建失败');
    }
  };

  const handleSelectPortfolio = async (id: number) => {
    await selectPortfolio(id);
  };

  const handleDeletePortfolio = async (id: number) => {
    try {
      await deletePortfolio(id);
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleAddItem = async (values: any) => {
    if (!selectedPortfolio) return;

    try {
      await addItem(selectedPortfolio.id, {
        ...values,
        purchase_date: values.purchase_date.format('YYYY-MM-DD'),
      });
      message.success('添加成功');
      setIsAddItemModalOpen(false);
      addItemForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '添加失败');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedPortfolio) return;

    try {
      await deleteItem(selectedPortfolio.id, itemId);
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '基金代码',
      dataIndex: ['fund', 'code'],
      key: 'code',
    },
    {
      title: '基金名称',
      dataIndex: ['fund', 'name'],
      key: 'name',
    },
    {
      title: '持有份额',
      dataIndex: 'shares',
      key: 'shares',
      render: (shares: number) => shares.toFixed(2),
    },
    {
      title: '成本价',
      dataIndex: 'cost_basis',
      key: 'cost_basis',
      render: (cost: number) => `¥${cost.toFixed(4)}`,
    },
    {
      title: '购买日期',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm
          title="确定删除这个持仓吗？"
          onConfirm={() => handleDeleteItem(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const performanceColumns = [
    {
      title: '基金代码',
      dataIndex: 'fund_code',
      key: 'fund_code',
    },
    {
      title: '基金名称',
      dataIndex: 'fund_name',
      key: 'fund_name',
    },
    {
      title: '持有份额',
      dataIndex: 'shares',
      key: 'shares',
      render: (shares: number) => shares.toFixed(2),
    },
    {
      title: '成本价',
      dataIndex: 'cost_basis',
      key: 'cost_basis',
      render: (cost: number) => `¥${cost.toFixed(4)}`,
    },
    {
      title: '当前净值',
      dataIndex: 'current_nav',
      key: 'current_nav',
      render: (nav: number) => `¥${nav.toFixed(4)}`,
    },
    {
      title: '持仓成本',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => `¥${cost.toFixed(2)}`,
    },
    {
      title: '持仓市值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '收益',
      dataIndex: 'return',
      key: 'return',
      render: (ret: number) => {
        const color = ret > 0 ? '#cf1322' : ret < 0 ? '#3f8600' : '#000';
        return <span style={{ color }}>{ret > 0 ? '+' : ''}¥{ret.toFixed(2)}</span>;
      },
    },
    {
      title: '收益率',
      dataIndex: 'return_percent',
      key: 'return_percent',
      render: (percent: number) => {
        const color = percent > 0 ? '#cf1322' : percent < 0 ? '#3f8600' : '#000';
        return <span style={{ color }}>{percent > 0 ? '+' : ''}{percent.toFixed(2)}%</span>;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>投资组合</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
          创建组合
        </Button>
      </div>

      <Row gutter={16}>
        {/* Portfolio List */}
        <Col xs={24} md={8}>
          <Card title="我的组合" style={{ marginBottom: '16px' }}>
            {portfolios.length === 0 ? (
              <Empty description="暂无组合" />
            ) : (
              <div>
                {portfolios.map((portfolio) => (
                  <Card
                    key={portfolio.id}
                    size="small"
                    style={{
                      marginBottom: '8px',
                      cursor: 'pointer',
                      border: selectedPortfolio?.id === portfolio.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    }}
                    onClick={() => handleSelectPortfolio(portfolio.id)}
                    extra={
                      <Popconfirm
                        title="确定删除这个组合吗？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeletePortfolio(portfolio.id);
                        }}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    }
                  >
                    <div style={{ fontWeight: 'bold' }}>{portfolio.name}</div>
                    {portfolio.description && (
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                        {portfolio.description}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Portfolio Details */}
        <Col xs={24} md={16}>
          {selectedPortfolio ? (
            <>
              {/* Performance Summary */}
              {performance && (
                <Card style={{ marginBottom: '16px' }}>
                  <Row gutter={16}>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="持仓成本"
                        value={performance.total_cost}
                        precision={2}
                        prefix="¥"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="持仓市值"
                        value={performance.current_value}
                        precision={2}
                        prefix="¥"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="总收益"
                        value={performance.total_return}
                        precision={2}
                        prefix="¥"
                        valueStyle={{
                          color: performance.total_return > 0 ? '#cf1322' : performance.total_return < 0 ? '#3f8600' : '#000',
                        }}
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="收益率"
                        value={performance.return_percent}
                        precision={2}
                        suffix="%"
                        valueStyle={{
                          color: performance.return_percent > 0 ? '#cf1322' : performance.return_percent < 0 ? '#3f8600' : '#000',
                        }}
                      />
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Holdings Table */}
              <Card
                title="持仓明细"
                extra={
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setIsAddItemModalOpen(true)}
                  >
                    添加持仓
                  </Button>
                }
              >
                <Table
                  columns={columns}
                  dataSource={selectedPortfolio.items}
                  rowKey="id"
                  pagination={false}
                  loading={loading}
                />
              </Card>

              {/* Performance Details */}
              {performance && performance.holdings.length > 0 && (
                <Card title="收益明细" style={{ marginTop: '16px' }}>
                  <Table
                    columns={performanceColumns}
                    dataSource={performance.holdings}
                    rowKey="fund_code"
                    pagination={false}
                    scroll={{ x: 1200 }}
                  />
                </Card>
              )}
            </>
          ) : (
            <Card>
              <Empty description="请选择一个组合" />
            </Card>
          )}
        </Col>
      </Row>

      {/* Create Portfolio Modal */}
      <Modal
        title="创建投资组合"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreatePortfolio}>
          <Form.Item
            label="组合名称"
            name="name"
            rules={[{ required: true, message: '请输入组合名称' }]}
          >
            <Input placeholder="例如：稳健型组合" />
          </Form.Item>

          <Form.Item label="组合描述" name="description">
            <Input.TextArea rows={3} placeholder="可选，描述这个组合的投资策略" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        title="添加持仓"
        open={isAddItemModalOpen}
        onCancel={() => {
          setIsAddItemModalOpen(false);
          addItemForm.resetFields();
        }}
        footer={null}
      >
        <Form form={addItemForm} layout="vertical" onFinish={handleAddItem}>
          <Form.Item
            label="选择基金"
            name="fund_id"
            rules={[{ required: true, message: '请选择基金' }]}
          >
            <Select
              showSearch
              placeholder="搜索基金"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={funds.map((fund) => ({
                value: fund.id,
                label: `${fund.code} - ${fund.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="持有份额"
            name="shares"
            rules={[{ required: true, message: '请输入持有份额' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="例如：1000.00"
            />
          </Form.Item>

          <Form.Item
            label="成本价"
            name="cost_basis"
            rules={[{ required: true, message: '请输入成本价' }]}
          >
            <InputNumber
              min={0}
              step={0.0001}
              precision={4}
              style={{ width: '100%' }}
              placeholder="例如：1.2345"
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            label="购买日期"
            name="purchase_date"
            rules={[{ required: true, message: '请选择购买日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PortfolioPage;
