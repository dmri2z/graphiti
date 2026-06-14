"""Edge (fact) type definitions for Graphiti MCP Server.

Edge types describe the kind of relationship a fact represents between two
entities. They are registered with graphiti-core via ``add_episode``'s
``edge_types`` argument, and constrained to specific source/target entity-type
pairs via ``edge_type_map``.

This ontology is targeted at ESG / non-financial analysis: how organizations
disclose metrics, commit to targets, answer to regulations and frameworks, face
risks, address topics via policies, and impact and engage stakeholders.

Attributes declared on an edge model are extracted by the LLM and stored on the
edge. Only use information present in the episode to populate them.
"""

from pydantic import BaseModel, Field


class MentionedIn(BaseModel):
    """An entity is referenced, described, or discussed within a source.

    Connects an entity to the document, report, or disclosure in which it appears.
    """

    ...


class Requires(BaseModel):
    """A regulation or framework requires a disclosure, metric, or action.

    Commonly connects a Regulation or Framework to the Metric or topic it mandates be
    reported.
    """

    ...


class Discloses(BaseModel):
    """An organization reports or discloses a metric, topic, or data point.

    Connects an Organization to the Metric or ESGTopic it publicly reports on.
    """

    ...


class CommitsTo(BaseModel):
    """An organization commits to a sustainability target, pledge, or goal."""

    target_year: str | None = Field(
        default=None,
        description='The target year or deadline of the commitment. Only use information present in the context.',
    )


class SubjectTo(BaseModel):
    """An organization is governed by or subject to a regulation.

    Connects an Organization to a Regulation that legally applies to it.
    """

    ...


class ReportsUnder(BaseModel):
    """An organization reports under, aligns with, or is rated by a voluntary framework.

    Connects an Organization to a Framework or standard it uses for disclosure.
    """

    ...


class Faces(BaseModel):
    """An organization is exposed to or faces an ESG-related risk."""

    ...


class Addresses(BaseModel):
    """A policy or commitment addresses, manages, or mitigates an ESG topic or risk."""

    ...


class MaterialTo(BaseModel):
    """An ESG topic is material or relevant to an organization (or its sector)."""

    ...


class Impacts(BaseModel):
    """An organization's activity impacts a stakeholder or ESG topic."""

    direction: str | None = Field(
        default=None,
        description="The direction of the impact: 'positive' or 'negative'. Only set when clear from context.",
    )


class Engages(BaseModel):
    """An organization engages, consults, or interacts with a stakeholder."""

    ...


class Measures(BaseModel):
    """A metric measures or quantifies an ESG topic."""

    ...


EDGE_TYPES: dict[str, type[BaseModel]] = {
    'MentionedIn': MentionedIn,
    'Requires': Requires,
    'Discloses': Discloses,
    'CommitsTo': CommitsTo,
    'SubjectTo': SubjectTo,
    'ReportsUnder': ReportsUnder,
    'Faces': Faces,
    'Addresses': Addresses,
    'MaterialTo': MaterialTo,
    'Impacts': Impacts,
    'Engages': Engages,
    'Measures': Measures,
}
