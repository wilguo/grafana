import React, { useEffect, useMemo, useState } from 'react';

import { Button, Icon } from '@grafana/ui';
import { CombinedRuleNamespace, RuleNamespace } from 'app/types/unified-alerting';

import { LogMessages, logInfo } from '../../Analytics';
import { fetchRules } from '../../api/prometheus';
import { AlertingAction } from '../../hooks/useAbilities';
import { useCombinedRuleNamespaces } from '../../hooks/useCombinedRuleNamespaces';
import { GRAFANA_RULES_SOURCE_NAME, isCloudRulesSource, isGrafanaRulesSource } from '../../utils/datasource';
import { Authorize } from '../Authorize';

import { CloudRules } from './CloudRules';
import { GrafanaRules } from './GrafanaRules';

interface Props {
  namespaces: CombinedRuleNamespace[];
  expandAll: boolean;
}

export const RuleListGroupView = ({ namespaces, expandAll }: Props) => {
  const [grafanaNamespaces] = useMemo(() => {
    const sorted = namespaces
      .map((namespace) => ({
        ...namespace,
        groups: namespace.groups.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [
      sorted.filter((ns) => isGrafanaRulesSource(ns.rulesSource)),
      sorted.filter((ns) => isCloudRulesSource(ns.rulesSource)),
    ];
  }, [namespaces]);

  useEffect(() => {
    logInfo(LogMessages.loadedList);
  }, []);

  const dataSourceName = 'AMP Workspace';
  const [rules, setRules] = useState<RuleNamespace[]>([]);
  const [paginationData, setPaginationData] = useState<{
    prevPage: boolean;
    nextPage: boolean;
    pageNumber: number;
    nextTokens: string[];
  }>({
    prevPage: false,
    nextPage: false,
    pageNumber: 0,
    nextTokens: [],
  });

  const combinedRules = useCombinedRuleNamespaces(GRAFANA_RULES_SOURCE_NAME, rules);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetchRules(dataSourceName, undefined, undefined, undefined, undefined, undefined, '');
      setRules(response.ruleNamespaces);
      setPaginationData({
        prevPage: false,
        nextPage: response.nextToken !== '',
        pageNumber: 1,
        nextTokens: [...paginationData.nextTokens, response.nextToken],
      });
    };

    fetchData();

    // Clean-up function (optional)
    return () => {
      // Perform any clean-up tasks if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Authorize actions={[AlertingAction.ViewAlertRule]}>
        <GrafanaRules namespaces={grafanaNamespaces} expandAll={expandAll} />
      </Authorize>
      <Authorize actions={[AlertingAction.ViewExternalAlertRule]}>
        <CloudRules namespaces={combinedRules} expandAll={expandAll} />
      </Authorize>
      <div>
        <Button
          aria-label={`previous page`}
          size="sm"
          variant="secondary"
          disabled={!paginationData.prevPage}
          onClick={async () => {
            if (paginationData.pageNumber === 2) {
              const response = await fetchRules(
                dataSourceName,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined
              );
              setRules(response.ruleNamespaces);
              setPaginationData({
                prevPage: false,
                nextPage: true,
                pageNumber: paginationData.pageNumber - 1,
                nextTokens: [...paginationData.nextTokens],
              });
            } else {
              const response = await fetchRules(
                dataSourceName,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                paginationData.nextTokens[paginationData.pageNumber]
              );
              setRules(response.ruleNamespaces);
              setPaginationData({
                prevPage: true,
                nextPage: true,
                pageNumber: paginationData.pageNumber - 1,
                nextTokens: [...paginationData.nextTokens],
              });
            }
          }}
        >
          <Icon name="angle-left" />
        </Button>
        <Button
          aria-label={`next page`}
          size="sm"
          variant="secondary"
          disabled={!paginationData.nextPage}
          onClick={async () => {
            // console.log("[CloudRules.tsx] rules: " + JSON.stringify(rules));
            const response = await fetchRules(
              dataSourceName,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              paginationData.nextTokens[paginationData.pageNumber - 1]
            );
            setRules(response.ruleNamespaces);

            if (response.nextToken !== '') {
              setPaginationData({
                prevPage: true,
                nextPage: true,
                pageNumber: paginationData.pageNumber + 1,
                nextTokens: paginationData.nextTokens.includes(response.nextToken)
                  ? [...paginationData.nextTokens]
                  : [...paginationData.nextTokens, response.nextToken],
              });
            } else {
              setPaginationData({
                prevPage: true,
                nextPage: false,
                pageNumber: paginationData.pageNumber + 1,
                nextTokens: [...paginationData.nextTokens],
              });
            }
          }}
        >
          <Icon name="angle-right" />
        </Button>
      </div>
      <div>
        Page Number: <span>{paginationData.pageNumber}</span>
      </div>
    </>
  );
};
