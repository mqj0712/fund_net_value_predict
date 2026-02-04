import React, { useEffect, useState } from 'react';
import { Table, Collapse, DatePicker, Space, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { fundsApi } from '../../api/funds';
import type { NavHistory as NavHistoryType } from '../../types';
import type { TableProps } from 'antd';

const { RangePicker } = DatePicker;

interface NavHistoryTableProps {
  fundCode: string;
  startDate?: string;
  endDate?: string;
}

const NavHistoryTable: React.FC<NavHistoryTableProps> = ({
  fundCode,
  startDate,
  endDate,
}) => {
  const [historyData, setHistoryData] = useState<NavHistoryType[]>([]);
  const [filteredData, setFilteredData] = useState<NavHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Fetch history data
  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const data = await fundsApi.getNavHistory(
        fundCode,
        startDate,
        endDate,
      );
      setHistoryData(data);
      setFilteredData(data);
      setPagination((prev) => ({ ...prev, total: data.length }));
    } catch (error) {
      message.error('获取历史净值数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [fundCode, startDate, endDate]);

  // Handle table change (pagination, sorter)
  const handleTableChange: TableProps<NavHistoryType>['onChange'] = (
    paginationConfig
  ) => {
    setPagination({
      current: paginationConfig.current || 1,
      pageSize: paginationConfig.pageSize || 20,
      total: paginationConfig.total || 0,
    });
  };

  // Quick date filter handlers
  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setFilterStartDate(start);
    setFilterEndDate(end);

    applyDateFilter(start, end);
  };

  const handleResetFilter = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
    setFilteredData(historyData);
    setPagination((prev) => ({ ...prev, total: historyData.length }));
  };

  const handleCustomDateRange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const start = dates[0].toDate();
      const end = dates[1].toDate();
      setFilterStartDate(start);
      setFilterEndDate(end);
      applyDateFilter(start, end);
    } else {
      handleResetFilter();
    }
  };

  const applyDateFilter = (start: Date, end: Date) => {
    const filtered = historyData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });
    setFilteredData(filtered);
    setPagination((prev) => ({ ...prev, current: 1, total: filtered.length }));
  };

  const columns: TableProps<NavHistoryType>['columns'] = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a: NavHistoryType, b: NavHistoryType) =>
        dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '单位净值',
      dataIndex: 'nav',
      key: 'nav',
      align: 'right',
      sorter: (a: NavHistoryType, b: NavHistoryType) => a.nav - b.nav,
      render: (nav: number) => nav.toFixed(4),
    },
    {
      title: '累计净值',
      dataIndex: 'accumulated_nav',
      key: 'accumulated_nav',
      align: 'right',
      sorter: (a: NavHistoryType, b: NavHistoryType) =>
        (a.accumulated_nav || 0) - (b.accumulated_nav || 0),
      render: (nav: number) => nav?.toFixed(4) || '-',
    },
    {
      title: '日增长率',
      dataIndex: 'daily_growth',
      key: 'daily_growth',
      align: 'right',
      sorter: (a: NavHistoryType, b: NavHistoryType) =>
        (a.daily_growth || 0) - (b.daily_growth || 0),
      render: (growth: number) => {
        if (growth === null || growth === undefined) return '-';
        const color = growth > 0 ? '#cf1322' : growth < 0 ? '#3f8600' : '#000';
        return (
          <span style={{ color }}>
            {growth > 0 ? '+' : ''}
            {growth.toFixed(2)}%
          </span>
        );
      },
    },
  ];

  return (
    <>
      {/* Optional Date Filter */}
      <Collapse
        style={{ marginBottom: 16 }}
        defaultActiveKey={[]}
        items={[
          {
            key: 'filter',
            label: '日期筛选（可选）',
            children: (
              <Space wrap>
                <span>快捷选择：</span>
                <a onClick={() => handleQuickFilter(7)}>最近7天</a>
                <a onClick={() => handleQuickFilter(30)}>最近30天</a>
                <a onClick={() => handleQuickFilter(90)}>近3个月</a>
                <a onClick={handleResetFilter}>重置</a>
                <span style={{ marginLeft: 16 }}>自定义：</span>
                <RangePicker
                  value={
                    filterStartDate && filterEndDate
                      ? [dayjs(filterStartDate), dayjs(filterEndDate)]
                      : null
                  }
                  onChange={handleCustomDateRange}
                  format="YYYY-MM-DD"
                />
              </Space>
            ),
          },
        ]}
      />

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination((prev) => ({ ...prev, current: page, pageSize }));
          },
        }}
        onChange={handleTableChange}
      />
    </>
  );
};

export default NavHistoryTable;
