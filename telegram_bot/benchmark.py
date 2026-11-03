"""Read-only API/cache timings. No Telegram token or chat message is used."""
import argparse
import asyncio
import os
from pathlib import Path
from time import perf_counter

from api_client import NexoraClient
from dotenv import load_dotenv


async def main(base_url):
    client = NexoraClient(base_url, product_detail_path='/api/products/{id}', timeout=45)
    try:
        start = perf_counter()
        products = await client.get_products()
        print(f'First catalogue request: {(perf_counter()-start)*1000:.0f} ms; products: {len(products)}')
        start = perf_counter()
        await client.get_products()
        print(f'Warm in-process catalogue cache: {(perf_counter()-start)*1000:.0f} ms')
        if products:
            start = perf_counter()
            await client.get_product(products[0].id)
            print(f'Fresh product detail request: {(perf_counter()-start)*1000:.0f} ms')
    finally:
        await client.aclose()


if __name__ == '__main__':
    load_dotenv(Path(__file__).with_name('.env'))
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default=os.getenv('NEXORA_API_URL', 'http://localhost:8000'))
    args = parser.parse_args()
    try:
        asyncio.run(main(args.base_url))
    except Exception as exc:
        print(f'Benchmark failed ({type(exc).__name__}); check backend connectivity.')
        raise SystemExit(1) from None
