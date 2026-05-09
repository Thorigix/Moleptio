import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useTheme } from '@/services/theme';
import { Campaign } from '@/types/campaign';

type Step = {
  label: string;
  sublabel: string;
  done: boolean;
  active: boolean;
};

function buildSteps(hasTx: boolean, status: Campaign['status']): Step[] {
  const confirmed = hasTx;
  const thresholdMet = status === 'funded' || status === 'settled';
  const fulfilled = status === 'settled';

  return [
    {
      label: 'Payment Confirmed',
      sublabel: confirmed ? 'On-chain' : 'Pending',
      done: confirmed,
      active: confirmed,
    },
    {
      label: 'Threshold Met',
      sublabel: thresholdMet ? 'Group complete' : `Waiting for group`,
      done: thresholdMet,
      active: thresholdMet,
    },
    {
      label: 'Fulfilled',
      sublabel: fulfilled ? 'Complete' : 'After threshold',
      done: fulfilled,
      active: fulfilled,
    },
  ];
}

type Props = {
  hasTx: boolean;
  campaignStatus: Campaign['status'];
};

export function CampaignStatusTrack({ hasTx, campaignStatus }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const steps = buildSteps(hasTx, campaignStatus);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Order Status</Text>

      <View style={styles.track}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const lineActive = steps[i + 1]?.done ?? false;
          return (
            <View key={step.label} style={styles.stepWrapper}>
              <View style={styles.stepColumn}>
                {/* Node */}
                <View
                  style={[
                    styles.node,
                    step.done && styles.nodeDone,
                    !step.done && !step.active && styles.nodeInactive,
                  ]}>
                  {step.done && <Text style={styles.nodeCheck}>✓</Text>}
                </View>

                {/* Connector line (not after last step) */}
                {!isLast && (
                  <View style={[styles.line, lineActive && styles.lineDone]} />
                )}
              </View>

              <View style={styles.labelCol}>
                <Text
                  style={[styles.stepLabel, !step.active && styles.stepLabelInactive]}>
                  {step.label}
                </Text>
                <Text style={styles.stepSublabel}>{step.sublabel}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const NODE_SIZE = 22;
const LINE_WIDTH = 2;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: 14,
    },
    heading: {
      color: c.text,
      fontSize: 15,
      fontWeight: '600',
    },
    track: {
      gap: 0,
    },
    stepWrapper: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-start',
    },
    stepColumn: {
      alignItems: 'center',
      width: NODE_SIZE,
    },
    node: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: NODE_SIZE / 2,
      borderWidth: LINE_WIDTH,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeDone: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    nodeInactive: {
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    nodeCheck: {
      color: c.ctaText,
      fontSize: 11,
      fontWeight: '700',
    },
    line: {
      width: LINE_WIDTH,
      height: 28,
      backgroundColor: c.border,
      marginVertical: 3,
    },
    lineDone: {
      backgroundColor: c.accent,
    },
    labelCol: {
      flex: 1,
      paddingTop: 2,
      paddingBottom: 18,
      gap: 2,
    },
    stepLabel: {
      color: c.text,
      fontSize: 14,
      fontWeight: '600',
    },
    stepLabelInactive: {
      color: c.textSubtle,
      fontWeight: '400',
    },
    stepSublabel: {
      color: c.textSubtle,
      fontSize: 12,
    },
  });
