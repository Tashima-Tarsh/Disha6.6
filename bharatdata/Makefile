.PHONY: help install test test-coverage index search-server search-cli healthcheck clean

PYTHON ?= python

help:
	@echo "BharatData Makefile targets:"
	@echo "  install        - Install dependencies via pip"
	@echo "  test           - Run pytest on all tests"
	@echo "  test-coverage  - Run pytest with code coverage"
	@echo "  init-db        - Initialize SQLite schema from schema/*.sql"
	@echo "  healthcheck    - Run live health check across upstreams"
	@echo "  search-server  - Run local search API server"
	@echo "  clean          - Remove build, test, and cache artifacts"

install:
	$(PYTHON) -m pip install -r requirements.txt

test:
	$(PYTHON) -m pytest tests -v

test-coverage:
	$(PYTHON) -m pytest tests -v --cov=ingest --cov=live --cov=search

init-db:
	$(PYTHON) -c "import sqlite3, glob; con = sqlite3.connect('index/bharatdata.db'); [con.executescript(open(f, encoding='utf-8').read()) for f in sorted(glob.glob('schema/*.sql'))]; con.close(); print('Database initialized at index/bharatdata.db')"

healthcheck:
	$(PYTHON) -m live.healthcheck

search-server:
	$(PYTHON) -m search.server --port 8000

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.py[co]" -delete
	rm -rf .pytest_cache .coverage htmlcov index/bharatdata.db

