import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const ResponseTimeChart = ({ data }) => {
  const chartData = data.map((r) => ({
    time: formatTime(r.checkedAt),
    responseTime: r.responseTime,
    status: r.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}ms`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#d1d5db' }}
          formatter={(value) => [`${value} ms`, 'Response Time']}
        />
        <Line
          type="monotone"
          dataKey="responseTime"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#3b82f6' }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ResponseTimeChart;
