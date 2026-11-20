"""The published data are valid and every dataset has a builder.

The generic tests of the package (loading, aggregation, the analyses) live in the
package's repository, quarcs-lab/geo4bolivia, and run against this repository's files.
Facts about Bolivia are in tests/test_project.py.
"""

from geo4bolivia import metadata, validate
from geo4bolivia.build import load_builders


def test_everything_validates():
    reports = validate.run()
    assert all(r.ok for r in reports), "\n".join(str(r) for r in reports if not r.ok)


def test_every_dataset_has_a_builder():
    builders = load_builders()
    assert callable(builders.build_geo)
    assert set(builders.DATASETS) == set(metadata.dataset_ids())
