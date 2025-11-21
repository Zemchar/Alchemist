import React from 'react';
import {Dimensions, View} from 'react-native';
import Svg, {Line, Path, Text as SvgText} from 'react-native-svg';
import {Colors} from '@/constants/Colors';
import {useColorScheme} from '@/hooks/useColorScheme';

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}

export interface DataPoint {
    time: number;
    intensity: number;
}

interface AreaChartProps {
    data: Record<string, DataPoint[]>;
    startTime: number;
    height?: number;
    width?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingVertical?: number;
    lineColor?: string[];
    fillColor?: string[];
}

export const AreaChart: React.FC<AreaChartProps> = ({
                                                        data = {},
                                                        startTime = new Date(Date.now()),
                                                        height = 200,
                                                        width = Dimensions.get('window').width - 40,
                                                        paddingLeft = 10,
                                                        paddingRight = 20,
                                                        paddingVertical = 20,
                                                        lineColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'],
                                                        fillColor = [],
                                                    }) => {
    const colorScheme = useColorScheme();
    const defaultTextColor = Colors[colorScheme ?? 'light'].text;

    // Chart dimensions
    const chartWidth = width - (paddingLeft + paddingRight);
    const chartHeight = height - (paddingVertical * 2);

    // Get all time values (already in hours)
    const timePoints = Object.values(data)
        .flat()
        .map(point => point.time)
        .filter(time => typeof time === 'number' && isFinite(time));

    console.log('Time points:', timePoints);

    if (timePoints.length === 0) return null;

    // Simple min/max calculations
    const minTime = 0; // Assuming time starts at 0 hours
    const maxTime = Math.max(...timePoints);

    console.log('Time range:', {minTime, maxTime});

    // Simple linear scale
    const xScale = (hours: number): number => {
        return (hours / maxTime) * chartWidth;
    };

    const yScale = (intensity: number): number => {
        return chartHeight - (intensity * chartHeight / 4);
    };


    // Generate hour ticks
    const hourTicks = Array.from(
        {length: Math.ceil(maxTime) + 1},
        (_, i) => ({
                hour: i,
                x: xScale(i) + paddingLeft,
                label: (startTime.getHours() + i) % 24
            }
        ));


    // Generate paths
    const generatePaths = (dataset: DataPoint[]) => {
        if (!Array.isArray(dataset) || dataset.length < 2) return {pathData: '', areaPath: ''};

        const points = dataset
            .filter(point => typeof point.time === 'number' && isFinite(point.time))
            .map(point => ({
                x: xScale(point.time) + paddingLeft,
                y: yScale(point.intensity) + paddingVertical
            }));

        if (points.length < 2) return {pathData: '', areaPath: ''};

        const pathData = points.reduce((path, point, i) =>
                i === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`,
            ''
        );

        const baselineY = height - paddingVertical;
        const areaPath = `${pathData} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

        return {pathData, areaPath};
    };

    return (
        <View style={{width, height}}>
            <Svg width={width} height={height}>
                {console.log(((new Date(Date.now()).getHours() - startTime.getHours()) +
                    ((startTime.getMinutes() - new Date(Date.now()).getMinutes())) / 60))}
                {((new Date(Date.now()).getTime() - startTime.getTime()) >= 0 &&
                    ((new Date(Date.now()).getHours() - startTime.getHours()) +
                        (startTime.getMinutes() - new Date(Date.now()).getMinutes())) / 60 <= maxTime) && (
                    <Line
                        x1={xScale(((new Date(Date.now()).getHours() - startTime.getHours()) +
                            ((startTime.getMinutes() - new Date(Date.now()).getMinutes()) / 60))) + paddingLeft}
                        y1={paddingVertical}
                        x2={xScale(((new Date(Date.now()).getHours() - startTime.getHours()) +
                            ((startTime.getMinutes() - new Date(Date.now()).getMinutes()) / 60))) + paddingLeft}
                        y2={height - paddingVertical}
                        stroke="#FFFFFF"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                    />
                )}
                {/* Axes */}
                <Line
                    x1={paddingLeft}
                    y1={paddingVertical}
                    x2={paddingLeft}
                    y2={height - paddingVertical}
                    stroke={defaultTextColor}
                    strokeWidth="1"
                />
                <Line
                    x1={paddingLeft}
                    y1={height - paddingVertical}
                    x2={width}
                    y2={height - paddingVertical}
                    stroke={defaultTextColor}
                    strokeWidth="1"
                />

                {/* Y-axis labels */}
                {['no effects', 'mild', 'moderate', 'strong', 'intense'].map((label, i) => (
                    <React.Fragment key={`y-tick-${i}`}>
                        <Line
                            x1={paddingLeft - 5}
                            y1={yScale(i) + paddingVertical}
                            x2={paddingLeft}
                            y2={yScale(i) + paddingVertical}
                            stroke={defaultTextColor}
                            strokeWidth="1"
                        />
                    </React.Fragment>
                ))}

                {/* Hour ticks */}
                {hourTicks.map(({x, label}, i) => (
                    <React.Fragment key={`x-tick-${i}`}>
                        <Line
                            x1={x}
                            y1={height - paddingVertical}
                            x2={x}
                            y2={height - paddingVertical + 5}
                            stroke={defaultTextColor}
                            strokeWidth="1"
                        />
                        <SvgText
                            x={x}
                            y={height - paddingVertical + 16}
                            fill={defaultTextColor}
                            textAnchor="middle"
                            fontSize="10"
                        >
                            {label}
                        </SvgText>
                        {/* Progress indicator line */}
                    </React.Fragment>
                ))}

                {/* Data lines */}
                {Object.entries(data).map(([key, dataset], index) => {
                    const {pathData, areaPath} = generatePaths(dataset);
                    if (!pathData || !areaPath) return null;

                    const currentColor = lineColor[index % lineColor.length];
                    const currentFill = fillColor[index] || currentColor;

                    return (
                        <React.Fragment key={key}>
                            <Path
                                d={areaPath}
                                fill={currentFill}
                                fillOpacity="0.1"
                            />
                            <Path
                                d={pathData}
                                fill="none"
                                stroke={currentColor}
                                strokeWidth="2"
                            />
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
};