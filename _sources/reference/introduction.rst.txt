
.. _introduction:

************
Introduction
************

This reference manual describes the Python programming language. It is not
intended as a tutorial.

While I am trying to be as precise as possible, I chose to use English rather
than formal specifications for everything except syntax and lexical analysis.
This should make the document more understandable to the average reader, but
will leave room for ambiguities. Consequently, if you were coming from Mars and
tried to re-implement Python from this document alone, you might have to guess
things and in fact you would probably end up implementing quite a different
language. On the other hand, if you are using Python and wonder what the precise
rules about a particular area of the language are, you should definitely be able
to find them here. If you would like to see a more formal definition of the
language, maybe you could volunteer your time --- or invent a cloning machine
:-).

It is dangerous to add too many implementation details to a language reference
document --- the implementation may change, and other implementations of the
same language may work differently.  On the other hand, CPython is the one
Python implementation in widespread use (although alternate implementations
continue to gain support), and its particular quirks are sometimes worth being
mentioned, especially where the implementation imposes additional limitations.
Therefore, you'll find short "implementation notes" sprinkled throughout the
text.

Every Python implementation comes with a number of built-in and standard
modules.  These are documented in :ref:`library-index`.  A few built-in modules
are mentioned when they interact in a significant way with the language
definition.


.. _implementations:

Alternate Implementations
=========================

Though there is one Python implementation which is by far the most popular,
there are some alternate implementations which are of particular interest to
different audiences.

.. admonition:: flowdas

   "눈에 띄게 널리 사용되는 파이썬 구현" 은 당연히 CPython 을 뜻합니다.

Known implementations include:

CPython
   This is the original and most-maintained implementation of Python, written in C.
   New language features generally appear here first.

Jython
   Python implemented in Java.  This implementation can be used as a scripting
   language for Java applications, or can be used to create applications using the
   Java class libraries.  It is also often used to create tests for Java libraries.
   More information can be found at `the Jython website <http://www.jython.org/>`_.

Python for .NET
   This implementation actually uses the CPython implementation, but is a managed
   .NET application and makes .NET libraries available.  It was created by Brian
   Lloyd.  For more information, see the `Python for .NET home page
   <https://pythonnet.github.io/>`_.

IronPython
   An alternate Python for .NET.  Unlike Python.NET, this is a complete Python
   implementation that generates IL, and compiles Python code directly to .NET
   assemblies.  It was created by Jim Hugunin, the original creator of Jython.  For
   more information, see `the IronPython website <http://ironpython.net/>`_.

   .. admonition:: flowdas

      Jim Hugunin 은 수치 연산에 널리 사용되는 NumPy 의 전신인 Numerical Python 의 저자이기도 합니다.

PyPy
   An implementation of Python written completely in Python. It supports several
   advanced features not found in other implementations like stackless support
   and a Just in Time compiler. One of the goals of the project is to encourage
   experimentation with the language itself by making it easier to modify the
   interpreter (since it is written in Python).  Additional information is
   available on `the PyPy project's home page <http://pypy.org/>`_.

   .. admonition:: flowdas

      대안 구현들 중에서 가장 주목받는 구현입니다. 여러 이유가 있겠지만, 특히 JIT 컴파일러로 인해 순수한 파이썬 코드의
      경우는 CPython 보다도 높은 속도를 보여주고 있습니다. 파이썬 3 지원이 뒤처져있는 것이 문제였지만, 최근의
      파이썬 3.5 지원으로 인해 사용자 층을 더 늘릴 수 있을 것으로 보입니다.

Each of these implementations varies in some way from the language as documented
in this manual, or introduces specific information beyond what's covered in the
standard Python documentation.  Please refer to the implementation-specific
documentation to determine what else you need to know about the specific
implementation you're using.


.. _notation:

Notation
========

.. index:: BNF, grammar, syntax, notation

The descriptions of lexical analysis and syntax use a modified BNF grammar
notation.  This uses the following style of definition:

.. admonition:: flowdas

   BNF 는 Backus–Naur Form 을 뜻하는데, 형식 문법을 정의하는데 사용되는 표기법입니다.
   기본 개념은 기호들의 생성 규칙들을 나열하는 것인데, 여러 변종이 있어서 조금씩 표기법의 차이를 보입니다.
   이 문서에서 사용하는 **수정된** BNF 의 표기법은 아래에서 설명됩니다.

   문법의 형식 정의는 보통 두 가지 단계로 나누어 기술됩니다. 첫번째는 구문 분석이라는 단계로,
   개별 문자들을 조합하여 조금 높은 수준의 토큰들을 만들어내는 것입니다. 토큰들은 정수, 키워드와 같은 것들입니다.
   두번째는 문법 구성 단계로, 이 토큰들이 문법적인 구조를 이루도록 연결하는 것입니다.
   이 문서도 두 단계를 따로 기술하고 있는데, 두 경우 모두 BNF 표기법을 사용해서 기술하고 있습니다.

.. productionlist:: *
   name: `lc_letter` (`lc_letter` | "_")*
   lc_letter: "a"..."z"

The first line says that a ``name`` is an ``lc_letter`` followed by a sequence
of zero or more ``lc_letter``\ s and underscores.  An ``lc_letter`` in turn is
any of the single characters ``'a'`` through ``'z'``.  (This rule is actually
adhered to for the names defined in lexical and grammar rules in this document.)

.. admonition:: flowdas

   마지막 "이 규칙은 이 문서에서 구문과 문법 규칙에서 정의되는 이름들에 대한 규칙이다." 라는 문장은,
   이 규칙이 이 문서에서 BNF 문법 표기법에 사용한 이름들에 적용되는 규칙이라는 뜻입니다.
   즉 `name` 과 `lc_letter` 가 name 규칙을 따르고 있어서, 영어 소문자와 밑줄 만으로 구성되어 있고,
   영어 소문자로 시작합니다.

Each rule begins with a name (which is the name defined by the rule) and
``::=``.  A vertical bar (``|``) is used to separate alternatives; it is the
least binding operator in this notation.  A star (``*``) means zero or more
repetitions of the preceding item; likewise, a plus (``+``) means one or more
repetitions, and a phrase enclosed in square brackets (``[ ]``) means zero or
one occurrences (in other words, the enclosed phrase is optional).  The ``*``
and ``+`` operators bind as tightly as possible; parentheses are used for
grouping.  Literal strings are enclosed in quotes.  White space is only
meaningful to separate tokens. Rules are normally contained on a single line;
rules with many alternatives may be formatted alternatively with each line after
the first beginning with a vertical bar.

.. admonition:: flowdas

   "``*`` 와 ``+`` 연산자는 최대한 엄격하게 연결된다" 는,
   연산자 우선 순위가 가장 높기 때문에 가장 직전의 항목에만 적용될 뿐 그 이전의 항목까지 확장되지는 않는다는 뜻입니다.
   그 이전 까지 확장하려면 괄호를 사용해야 합니다.

.. admonition:: flowdas

   리러털(literal) 은 값 자체를 표현하는 문법 요소입니다. 가령 `'hello'`, `123` 처럼 원시 파일에 값이 그대로 입력되어 있는 형태를 뜻합니다.

.. index:: lexical definitions, ASCII

In lexical definitions (as the example above), two more conventions are used:
Two literal characters separated by three dots mean a choice of any single
character in the given (inclusive) range of ASCII characters.  A phrase between
angular brackets (``<...>``) gives an informal description of the symbol
defined; e.g., this could be used to describe the notion of 'control character'
if needed.

.. admonition:: flowdas

   홑화살괄호(``<...>``) 표기는 :ref:`identifiers` 에서 볼 수 있습니다. 완전한 BNF 를 사용해서 표기할 경우 너무 복잡해지는 반면,
   비형식적인 설명으로도 그 의미를 명확히 할 수 있을 때 사용됩니다.

Even though the notation used is almost the same, there is a big difference
between the meaning of lexical and syntactic definitions: a lexical definition
operates on the individual characters of the input source, while a syntax
definition operates on the stream of tokens generated by the lexical analysis.
All uses of BNF in the next chapter ("Lexical Analysis") are lexical
definitions; uses in subsequent chapters are syntactic definitions.

