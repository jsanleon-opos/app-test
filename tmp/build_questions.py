import json

def make_q(qid, enunciado, opciones, norma, articulo, codigoBOE, urlBOE, fundamento):
    return {
        "id": qid,
        "enunciado": enunciado,
        "opciones": opciones,
        "justificacionLegal": {
            "norma": norma,
            "articulo": articulo,
            "codigoBOE": codigoBOE,
            "urlBOE": urlBOE,
            "fundamento": fundamento
        }
    }

# We define the 70 unitarias and 20 supuestos with distributed correct letters and balanced lengths.
# Let's write the data definition.
