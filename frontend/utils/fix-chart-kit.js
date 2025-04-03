/**
 * This file patches react-native-chart-kit's imports.
 * Use this if you're having import issues with paths-js dependencies.
 *
 * Usage: import { LineChart } from './fix-chart-kit';
 */


// Only include chart types that don't depend on paths-js/pie
export { default as AbstractChart } from 'react-native-chart-kit/dist/AbstractChart';
export { default as BarChart } from 'react-native-chart-kit/dist/BarChart';
export { default as LineChart } from 'react-native-chart-kit/dist/line-chart';
export { default as StackedBarChart } from 'react-native-chart-kit/dist/StackedBarChart';


// Removed:
// - PieChart (depends on paths-js/pie)
// - ProgressChart (also depends on paths-js/pie)
// - ContributionGraph (was causing issues earlier)