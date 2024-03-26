import React, {useEffect, useMemo, useState} from 'react';

import {Button, Icon} from "@grafana/ui";
import {CombinedRuleNamespace, RuleNamespace} from 'app/types/unified-alerting';

import { LogMessages, logInfo } from '../../Analytics';
import {fetchRules} from "../../api/prometheus";
import { AlertingAction } from '../../hooks/useAbilities';
import {useCombinedRuleNamespaces} from "../../hooks/useCombinedRuleNamespaces";
import {GRAFANA_RULES_SOURCE_NAME, isCloudRulesSource, isGrafanaRulesSource} from '../../utils/datasource';
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

  const dataSourceName = "AMP Workspace";
  const [rules, setRules] = useState<RuleNamespace[]>([]);
  const [nextToken, setNextToken] = useState("");

  const combinedRules = useCombinedRuleNamespaces(GRAFANA_RULES_SOURCE_NAME, rules)


  useEffect(() => {
    const fetchData = async () => {
      const response = await fetchRules(dataSourceName, undefined, undefined, undefined, undefined, undefined, "");
      setRules(response.ruleNamespaces);
      setNextToken(response.nextToken);
    };

    fetchData();

    // Clean-up function (optional)
    return () => {
      // Perform any clean-up tasks if needed
    };
  }, []);

  return (
    <>
      <Authorize actions={[AlertingAction.ViewAlertRule]}>
        <GrafanaRules namespaces={grafanaNamespaces} expandAll={expandAll} />
      </Authorize>
      <Authorize actions={[AlertingAction.ViewExternalAlertRule]}>
        <CloudRules namespaces={combinedRules} expandAll={expandAll} />
      </Authorize>
      <Button
        aria-label={`next page`}
        size="sm"
        variant="secondary"
        onClick={async () => {
          console.log("[CloudRules.tsx] rules: " + JSON.stringify(rules));
          console.log("[CloudRules.tsx] nextToken: " + nextToken);
          const response = await fetchRules(dataSourceName, undefined, undefined, undefined, undefined, undefined, nextToken);
          setRules(response.ruleNamespaces);
          setNextToken(response.nextToken);
        }}
      >
        <Icon name="angle-right" />
      </Button>
    </>
  );
};
