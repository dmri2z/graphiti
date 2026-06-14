"""Entity type definitions for Graphiti MCP Server.

This ontology is targeted at ESG / non-financial analysis: companies, the
material sustainability topics that affect them, the regulations and reporting
frameworks they answer to, their risks, commitments, metrics, policies, and the
stakeholders they impact and engage.

Attributes declared on a model are extracted by the LLM and stored on the node.
Only use information present in the episode to populate them.
"""

from pydantic import BaseModel, Field


class Organization(BaseModel):
    """An Organization represents a company, institution, group, or formal entity.

    In an ESG context this is most often the reporting company being analyzed, but it
    also covers regulators, standard-setters, investors, suppliers, and NGOs when they
    are referenced as formal entities.

    Instructions for identifying and extracting organizations:
    1. Look for company names, employers, subsidiaries, and business entities
    2. Identify institutions (regulators, exchanges, government agencies, NGOs)
    3. Extract formal groups (industry associations, standard-setting bodies)
    4. Include organizational type when mentioned (company, nonprofit, agency)
    5. Note the organization's sector or industry when specified
    """

    description: str = Field(
        ...,
        description='Brief description of the organization, including its sector or role. Only use information mentioned in the context.',
    )


class Person(BaseModel):
    """A Person represents an individual human referenced in the content.

    In an ESG context this typically covers executives, board members, sustainability
    officers, regulators, and other named individuals.

    Instructions for identifying and extracting people:
    1. Look for named individuals (full names, first names, titles, or handles)
    2. Capture their role or relationship when stated (CEO, board chair, CSO)
    3. Prefer a specific, named person over a generic reference ("the auditor")
    4. Only record attributes that are present in the context
    """

    description: str = Field(
        ...,
        description='Brief description of the person and their role. Only use information mentioned in the context.',
    )


class Document(BaseModel):
    """A Document represents information content in various forms.

    In an ESG context this covers sustainability reports, annual reports, disclosures,
    regulatory filings, framework guidance, policies-as-published, and similar sources.

    Instructions for identifying and extracting documents:
    1. Look for references to reports, disclosures, filings, or published guidance
    2. Extract specific document titles or identifiers when available
    3. Include document type (sustainability report, 10-K, disclosure) when mentioned
    4. Capture the document's purpose, period, or subject matter
    5. Note relationships to authors, issuers, or sources
    """

    title: str = Field(
        ...,
        description='The title or identifier of the document.',
    )
    description: str = Field(
        ...,
        description='Brief description of the document and its content. Only use information mentioned in the context.',
    )


class Event(BaseModel):
    """An Event represents a time-bound activity, occurrence, or experience.

    In an ESG context this covers controversies, incidents (spills, breaches, strikes),
    disclosures, audits, AGMs, regulatory actions, and other dated occurrences.

    Instructions for identifying and extracting events:
    1. Look for occurrences with a specific time frame (incidents, filings, deadlines)
    2. Capture the purpose or nature of the event
    3. Include temporal information when available (date, period, duration)
    4. Note participants or stakeholders involved
    5. Identify outcomes or consequences when mentioned
    """

    description: str = Field(
        ...,
        description='Brief description of the event. Only use information mentioned in the context.',
    )


class ESGTopic(BaseModel):
    """An ESGTopic represents a material environmental, social, or governance topic.

    Examples: climate change, greenhouse-gas emissions, water stewardship, biodiversity,
    human rights, labor practices, diversity & inclusion, board composition, business ethics,
    data privacy. Capture the specific topic rather than the broad pillar when possible.

    Instructions for identifying and extracting topics:
    1. Look for sustainability subjects discussed as relevant or material
    2. Prefer specific topics ("Scope 3 emissions") over broad pillars ("environment")
    3. Classify the topic into one ESG dimension when it is clear
    """

    dimension: str | None = Field(
        default=None,
        description="The ESG dimension: 'Environmental', 'Social', or 'Governance'. Only set when clear from context.",
    )
    description: str = Field(
        ...,
        description='Brief description of the ESG topic and why it matters. Only use information mentioned in the context.',
    )


class Regulation(BaseModel):
    """A Regulation represents a mandatory ESG / non-financial reporting law, rule, or directive.

    Examples: CSRD, ESRS (as law), EU Taxonomy, SEC climate disclosure rules, UK SECR,
    California SB 253. Use this for legally binding obligations; use Framework for voluntary
    standards.

    Instructions for identifying and extracting regulations:
    1. Look for named laws, directives, rules, or mandatory disclosure regimes
    2. Capture the jurisdiction or issuing authority when stated
    3. Note what the regulation requires or covers
    """

    jurisdiction: str | None = Field(
        default=None,
        description='The jurisdiction or issuing authority (e.g. EU, US SEC, UK). Only use information mentioned in the context.',
    )
    description: str = Field(
        ...,
        description='Brief description of the regulation and its obligations. Only use information mentioned in the context.',
    )


class Framework(BaseModel):
    """A Framework represents a voluntary ESG reporting framework, standard, or rating scheme.

    Examples: GRI, SASB, TCFD, ISSB / IFRS S1-S2, CDP, SBTi, UN SDGs. Use this for voluntary
    or market standards; use Regulation for legally binding regimes.

    Instructions for identifying and extracting frameworks:
    1. Look for named voluntary standards, frameworks, or rating methodologies
    2. Capture the issuing body when stated
    3. Note what the framework measures, guides, or certifies
    """

    description: str = Field(
        ...,
        description='Brief description of the framework or standard and what it covers. Only use information mentioned in the context.',
    )


class Risk(BaseModel):
    """A Risk represents an ESG-related risk to an organization.

    Examples: physical climate risk (flooding, heat), transition risk (carbon pricing,
    stranded assets), regulatory/compliance risk, reputational risk, supply-chain or
    human-rights risk.

    Instructions for identifying and extracting risks:
    1. Look for stated threats, exposures, or vulnerabilities tied to ESG factors
    2. Classify the risk category when clear
    3. Capture the source and potential impact when described
    """

    category: str | None = Field(
        default=None,
        description='The risk category, e.g. physical, transition, regulatory, reputational. Only set when clear from context.',
    )
    description: str = Field(
        ...,
        description='Brief description of the risk and its potential impact. Only use information mentioned in the context.',
    )


class Commitment(BaseModel):
    """A Commitment represents a sustainability target, pledge, or goal.

    Examples: net-zero by 2050, 50% emissions cut by 2030, SBTi-validated target, 40% women
    in leadership, zero deforestation. Capture quantitative targets and their timelines when
    stated.

    Instructions for identifying and extracting commitments:
    1. Look for pledges, targets, goals, or stated ambitions
    2. Capture the target year or deadline when mentioned
    3. Capture quantitative magnitude (percentage, absolute) in the description
    """

    target_year: str | None = Field(
        default=None,
        description='The target year or deadline of the commitment (e.g. 2030, 2050). Only use information mentioned in the context.',
    )
    description: str = Field(
        ...,
        description='Brief description of the commitment, including its quantitative target. Only use information mentioned in the context.',
    )


class Metric(BaseModel):
    """A Metric represents an ESG KPI, indicator, or quantitative measure.

    Examples: Scope 1/2/3 emissions, energy intensity, water withdrawal, gender pay gap,
    employee turnover, board independence %, lost-time injury rate.

    Instructions for identifying and extracting metrics:
    1. Look for named quantitative indicators or KPIs and their reported values
    2. Capture the unit of measure when stated
    3. Record the value and reporting period in the description when present
    """

    unit: str | None = Field(
        default=None,
        description='The unit of measure (e.g. tCO2e, %, MWh, ratio). Only use information mentioned in the context.',
    )
    description: str = Field(
        ...,
        description='Brief description of the metric, including reported value and period when stated. Only use information mentioned in the context.',
    )


class Policy(BaseModel):
    """A Policy represents a corporate policy, governance practice, or management approach.

    Examples: code of conduct, environmental policy, human-rights policy, supplier code,
    whistleblower mechanism, board diversity policy, executive-pay link to ESG.

    Instructions for identifying and extracting policies:
    1. Look for named internal policies, codes, or governance practices
    2. Capture the ESG topic or risk the policy addresses
    3. Note scope and status (adopted, planned) when stated
    """

    description: str = Field(
        ...,
        description='Brief description of the policy or governance practice and what it covers. Only use information mentioned in the context.',
    )


class Stakeholder(BaseModel):
    """A Stakeholder represents a group with an interest in an organization's ESG performance.

    Examples: investors, regulators, employees, local communities, customers, suppliers, NGOs,
    indigenous groups. Use this for stakeholder groups as classes of interest; use Organization
    for a specific named entity.

    Instructions for identifying and extracting stakeholders:
    1. Look for groups affected by or interested in the organization's impacts
    2. Classify the stakeholder category when clear
    3. Capture the nature of their interest or relationship when described
    """

    category: str | None = Field(
        default=None,
        description='The stakeholder category, e.g. investor, employee, community, regulator, NGO, supplier. Only set when clear from context.',
    )
    description: str = Field(
        ...,
        description='Brief description of the stakeholder group and its interest. Only use information mentioned in the context.',
    )


ENTITY_TYPES: dict[str, type[BaseModel]] = {
    'Organization': Organization,
    'Person': Person,
    'Document': Document,
    'Event': Event,
    'ESGTopic': ESGTopic,
    'Regulation': Regulation,
    'Framework': Framework,
    'Risk': Risk,
    'Commitment': Commitment,
    'Metric': Metric,
    'Policy': Policy,
    'Stakeholder': Stakeholder,
}
