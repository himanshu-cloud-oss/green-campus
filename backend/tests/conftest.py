"""Pytest fixtures and test database configuration."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from scripts.seed_data import seed_database_if_empty

# In-memory SQLite database for isolated test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def setup_test_db():
    """Create all tables in memory once for the session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database_if_empty(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(setup_test_db):
    """Provide a transactional database session per test function."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """FastAPI TestClient with overridden get_db dependency pointing to the test DB."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
