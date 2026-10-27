"""UNEP account hierarchy from printed annex boundaries and subtotal rows."""
import re
from secretariat_xb_frontend import money, reference

ANNEX_TITLES = {
    'I': 'Environment Fund segment',
    'II': 'Other support to the programme of work segment of the United Nations Environment Programme',
    'III': 'Conventions and protocols segment',
    'IV': 'Multilateral Fund segment',
    'V': 'Programme support segment',
    'VI': 'End-of-service and post-retirement benefits segment',
}


def rollup_title(label):
    return re.sub(r'\s*:?\s*totals?\s*$', '', label, flags=re.I).strip()


def unep_hierarchy(facts, source_id, accounts, entity_id):
    """Group consecutive source rows; never infer a group by fuzzy fund names."""
    groups = []
    by_account = {n['id']: n for n in accounts}
    for annex, title in ANNEX_TITLES.items():
        rows = sorted((r for r in facts if r['source_id'] == source_id and r['annex'] == annex
                       and r['metric'] == 'expenses'), key=lambda r: (int(r['pdf_page']), int(r['source_row'])))
        if not rows:
            continue
        controls = [r for r in rows if r['object_kind'] == 'reported_rollup']
        control = controls[-1]
        parent_id = f'xb:UNEP:annex:{annex}'
        annex_accounts = [by_account[f'xb:{r["object_id"]}'] for r in rows if r['object_kind'] == 'fund_account']
        refs = [reference(control)]
        parent = dict(id=parent_id, parentId=entity_id, tier='detail', kind='allocation',
                      label=title, amount=money(control['amount_usd']),
                      values={'extrabudgetary': money(control['amount_usd'])},
                      sourceGroup='separate_entities', source=refs[0], supportingSources=refs,
                      detailGrouping=True, detailLabel='Fund groups and accounts', basis='directly_printed',
                      sourceMeasure='Reported gross segment expenses', contributorsAvailable=False,
                      contributorScope='UNEP:annex:'+annex,
                      note='Printed annex segment total before entity-level eliminations. Subtotals and accounts are alternative levels of detail, not additional expenditure.')
        def attach_position(node, row, count):
            value = next((r for r in facts if r['source_id']==source_id and
                          r['object_id']==row['object_id'] and r['metric']=='closing_net_assets'),None)
            if value and value['amount_usd']:
                node['financialPosition'] = dict(asOf=f'{value["period_year"]}-12-31',fundCount=count,
                    metrics=[dict(key='netAssets',label='Net assets',amount=money(value['amount_usd']),
                                  fundsCovered=count,supportingSources=[reference(value)])])
        attach_position(parent,control,len(annex_accounts))
        pending = []
        for row in rows:
            if row['object_kind'] == 'fund_account':
                account = by_account[f'xb:{row["object_id"]}']
                account['parentId'] = parent_id
                pending.append(account)
            elif row['object_kind'] == 'reported_rollup':
                label = row['reported_label']
                # The final segment/net totals summarize all preceding subgroups.
                segment_control = (label.lower().startswith('net total') or
                    annex == 'II' and rollup_title(label) == 'Other support to UNEP programme of work' or
                    annex == 'III' and rollup_title(label) == 'Conventions and protocols')
                if segment_control:
                    continue
                if not pending:
                    raise ValueError(f'Empty printed UNEP group: {source_id} {label}')
                name = rollup_title(label)
                slug = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
                group_id = f'{parent_id}:group:{slug}'
                group = dict(parent, id=group_id, parentId=parent_id, label=name,
                             amount=money(row['amount_usd']), values={'extrabudgetary':money(row['amount_usd'])},
                             source=reference(row), supportingSources=[reference(row)],
                             detailLabel='Fund accounts', sourceMeasure='Reported gross fund-group expenses',
                             contributorScope=group_id.removeprefix('xb:'))
                group.pop("financialPosition",None)
                attach_position(group,row,len(pending))
                difference = group['amount'] - sum(n['amount'] for n in pending)
                if abs(difference) > 2000:
                    raise ValueError(f'UNEP subgroup does not reconcile: {source_id} {name}: {difference}')
                group['detailRoundingDifference'] = difference
                for account in pending:
                    account['parentId'] = group_id
                groups.append(group)
                pending = []
        # Accounts without a separately printed subtotal (e.g. PCL) stay directly
        # under their annex; the final total is not invented as a new fund group.
        parent['detailRoundingDifference'] = parent['amount'] - sum(
            n['amount'] for n in [*groups, *annex_accounts] if n['parentId'] == parent_id)
        if abs(parent['detailRoundingDifference']) > 3000:
            raise ValueError(f'UNEP annex group difference: {source_id} {annex}')
        groups.append(parent)
    return groups
