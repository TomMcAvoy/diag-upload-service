import {getAdminApiHeaders} from './helpers/auth';
import {Configuration} from 'shared/src/types';
import * as appConf from 'shared/src/app-conf';
import {provisionOrganization} from './helpers/organizations';
import {createUser, getUserHeaders} from './helpers/users';
import {assignOrganizationToUser} from './helpers/assignments';
import {getBillingEndpoint} from './helpers/billing';
import {CreditLedgerV2, CustomerPlan, Invoice, MetricsByType} from 'metronome/src';
import {OrganizationRepository} from '@repositories/OrganizationRepository/OrganizationRepository';
import {OrganizationModel} from '@repositories/OrganizationRepository/OrganizationModel';
import * as dynamoose from 'dynamoose';
import {dynamoDB} from 'shared/src/aws-clients';

describe('Billing API', () => {
  let user, org, adminApiHeaders, userHeaders;
  const conf = appConf.load() as Configuration;
  dynamoose.aws.ddb.set(dynamoDB);

  beforeAll(async () => {
    adminApiHeaders = await getAdminApiHeaders(conf);
    org = await provisionOrganization(adminApiHeaders);
    const organizationRepository = new OrganizationRepository(OrganizationModel);
    await organizationRepository.updateMetronomeCustomerId(org.organizationId, '58ba3ad5-8f36-4907-87f5-6fb37b3bcafa');
    user = await createUser(adminApiHeaders);
    await assignOrganizationToUser(adminApiHeaders, user, 200, org.organizationId);
    userHeaders = await getUserHeaders(user.email);
  });
  test('plan', async () => {
    const res = await getBillingEndpoint<{plan: CustomerPlan}>(userHeaders, org.organizationId, 'plan');
    expect(res.plan).toEqual({
      description: 'LogStream Standard Pay as You Go',
      id: '328c7384-435c-44b0-aa8f-1b260683190b',
      isActive: true,
      name: 'LogStream Standard Pay as You Go',
      planId: '57a7978a-7586-4b6d-a907-bebad0f067f1',
      startingOn: '2022-02-07T00:00:00+00:00'
    });
  });
  test('credits', async () => {
    const res = await getBillingEndpoint<{
      credits: {balance: number; baseCreditAmount: number; ledger: CreditLedgerV2};
    }>(userHeaders, org.organizationId, 'credits');
    expect(res.credits.balance).toEqual(1999900);
    expect(res.credits.baseCreditAmount).toEqual(2000000);
    expect(res.credits.ledger.starting_balance.including_pending).toEqual(1000000);
    expect(res.credits.ledger.ending_balance.including_pending).toEqual(1999900);
    expect(res.credits.ledger.ending_balance.excluding_pending).toEqual(2000000);
    expect(res.credits.ledger.pending_entries.length).toEqual(1);
    expect(res.credits.ledger.entries.length).toEqual(2);
    expect(res.credits.ledger.entries?.[0].amount).toEqual(1000000);
    expect(res.credits.ledger.entries?.[1].amount).toEqual(1000000);
  });
  test('invoices', async () => {
    const res = await getBillingEndpoint<{invoices: Invoice[]}>(userHeaders, org.organizationId, 'invoices');
    expect(res.invoices.length).toEqual(3);
  });
  test('metrics - Raw GBs Sent', async () => {
    const res = await getBillingEndpoint<MetricsByType>(userHeaders, org.organizationId, 'metrics/Raw GBs Sent/');
    expect(res.metrics.length).toEqual(30);
    expect(res.metricType).toEqual('Raw GBs Sent');
  });
  test('metrics - Raw GBs Received', async () => {
    const res = await getBillingEndpoint<MetricsByType>(userHeaders, org.organizationId, 'metrics/Raw GBs Received/');
    expect(res.metrics.length).toEqual(30);
    expect(res.metricType).toEqual('Raw GBs Received');
  });
  test('metrics - S3 GBs Sent', async () => {
    const res = await getBillingEndpoint<MetricsByType>(userHeaders, org.organizationId, 'metrics/S3 GBs Sent/');
    expect(res.metrics.length).toEqual(30);
    expect(res.metricType).toEqual('S3 GBs Sent');
  });
  test('metrics - Net GBs Sent', async () => {
    const res = await getBillingEndpoint<MetricsByType>(userHeaders, org.organizationId, 'metrics/Net GBs Sent/');
    expect(res.metrics.length).toEqual(30);
    expect(res.metricType).toEqual('Net GBs Sent');
  });
});
